package auth

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"pusdatin/backend/internal/config"
	"pusdatin/backend/internal/database"
)

const sessionCookiePrefix = "sb-pusdatin-auth-token"

// SessionUser is the resolved user object exposed to handlers.
type SessionUser struct {
	ID             string                      `json:"id"`
	Email          string                      `json:"email"`
	Name           string                      `json:"name"`
	Role           string                      `json:"role"`
	AppPermissions []database.AppPermission    `json:"appPermissions"`
}

type SessionContext struct {
	User            *SessionUser
	IsAuthenticated bool
	IsAdmin         bool
}

// BuildSessionContext derives a SessionContext from a verified Supabase user,
// mirroring lib/auth.ts getCurrentSessionContext.
func BuildSessionContext(ctx context.Context, cfg *config.Config, store *database.Store, supaUser *AuthUser) *SessionContext {
	fail := func() *SessionContext {
		return &SessionContext{User: nil, IsAuthenticated: false, IsAdmin: false}
	}
	if supaUser == nil || supaUser.ID == "" {
		return fail()
	}

	isCentralSuperAdmin := false
	if roleMeta, ok := supaUser.AppMetadata["role"].(string); ok && roleMeta == "super_admin" {
		isCentralSuperAdmin = true
	}
	if roleMeta, ok := supaUser.UserMetadata["role"].(string); ok && roleMeta == "super_admin" {
		isCentralSuperAdmin = true
	}
	if supaUser.Email != "" && strings.EqualFold(supaUser.Email, cfg.SuperAdminEmail) {
		isCentralSuperAdmin = true
	}

	role := "viewer"
	var profile *database.User
	var perms []database.AppPermission

	if isCentralSuperAdmin {
		role = "super_admin"
	} else {
		profile, _ = store.GetUserByEmail(ctx, supaUser.Email)
		if profile != nil {
			if profile.Status == "inactive" {
				return fail()
			}
			role = profile.Role
			if role == "" {
				role = "viewer"
			}
			perms, _ = store.GetUserPermissions(ctx, profile.ID)
		} else {
			return fail()
		}
	}
	if perms == nil {
		perms = []database.AppPermission{}
	}

	name := "Admin"
	if profile != nil && profile.Name != "" {
		name = profile.Name
	} else if fn, ok := supaUser.UserMetadata["full_name"].(string); ok && fn != "" {
		name = fn
	} else if supaUser.Email != "" {
		name = strings.Split(supaUser.Email, "@")[0]
	}

	return &SessionContext{
		User: &SessionUser{
			ID:             supaUser.ID,
			Email:          supaUser.Email,
			Name:           name,
			Role:           role,
			AppPermissions: perms,
		},
		IsAuthenticated: true,
		IsAdmin:         role == "super_admin" || role == "admin" || role == "sub_admin",
	}
}

// ResolveSession rebuilds the session context from the Supabase cookies,
// mirroring the old lib/auth.ts getCurrentSessionContext logic.
func ResolveSession(ctx context.Context, cfg *config.Config, store *database.Store, sc *Client, c *fiber.Ctx) *SessionContext {
	accessToken := ExtractAccessToken(c)
	if accessToken == "" {
		return &SessionContext{User: nil, IsAuthenticated: false, IsAdmin: false}
	}

	supaUser, err := sc.GetUser(ctx, accessToken)
	if err != nil || supaUser == nil || supaUser.ID == "" {
		return &SessionContext{User: nil, IsAuthenticated: false, IsAdmin: false}
	}
	return BuildSessionContext(ctx, cfg, store, supaUser)
}

// ExtractAccessToken reconstructs the access token from the chunked
// sb-pusdatin-auth-token cookies (same logic as frontend/src/proxy.ts).
func ExtractAccessToken(c *fiber.Ctx) string {
	// 1. Check Authorization header first (Bearer <token>)
	authHeader := c.Get("Authorization")
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			if token := strings.TrimSpace(parts[1]); token != "" {
				return token
			}
		}
	}

	// 2. Check Cookie
	chunks := map[string]string{}
	c.Request().Header.VisitAll(func(key, value []byte) {
		if string(key) != "Cookie" {
			return
		}
		for _, pair := range strings.Split(string(value), ";") {
			kv := strings.SplitN(strings.TrimSpace(pair), "=", 2)
			if len(kv) != 2 {
				continue
			}
			name := strings.TrimSpace(kv[0])
			if name == sessionCookiePrefix || strings.HasPrefix(name, sessionCookiePrefix+".") {
				chunks[name] = kv[1]
			}
		}
	})
	if len(chunks) == 0 {
		return ""
	}
	names := make([]string, 0, len(chunks))
	for n := range chunks {
		names = append(names, n)
	}
	sort.Strings(names)
	combined := ""
	for _, n := range names {
		combined += chunks[n]
	}
	return accessTokenFromValue(combined)
}

func accessTokenFromValue(combined string) string {
	decoded := combined
	if unescaped, err := url.QueryUnescape(combined); err == nil {
		decoded = unescaped
	}

	var raw string
	if strings.HasPrefix(decoded, "base64-") {
		enc := strings.TrimPrefix(decoded, "base64-")
		b, err := base64.RawURLEncoding.DecodeString(enc)
		if err != nil {
			b, err = base64.URLEncoding.DecodeString(enc)
		}
		if err != nil {
			b, err = base64.StdEncoding.DecodeString(enc)
		}
		if err != nil {
			return ""
		}
		raw = string(b)
	} else {
		raw = decoded
	}

	var obj struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal([]byte(raw), &obj); err == nil && obj.AccessToken != "" {
		return obj.AccessToken
	}
	var arr []struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal([]byte(raw), &arr); err == nil && len(arr) > 0 {
		return arr[0].AccessToken
	}
	return ""
}

// WriteSessionCookies writes the Supabase session into chunked cookies matching
// the @supabase/ssr format: name.{i} with URI-encoded base64url("base64-" + json).
// The session payload is slimmed down (only auth tokens + minimal user identity)
// to keep the Cookie header small and avoid dev-server 431 errors.
const maxChunkSize = 3180

func WriteSessionCookies(c *fiber.Ctx, sessionJSON []byte, secure bool) error {
	slim := slimSession(sessionJSON)
	encoded := "base64-" + base64.RawURLEncoding.EncodeToString(slim)
	uriEncoded := url.QueryEscape(encoded)

	chunks := []string{}
	for len(uriEncoded) > maxChunkSize {
		// Split on a valid boundary (ASCII-safe here, QueryEscape output).
		cut := maxChunkSize
		chunks = append(chunks, uriEncoded[:cut])
		uriEncoded = uriEncoded[cut:]
	}
	if len(uriEncoded) > 0 {
		chunks = append(chunks, uriEncoded)
	}

	for i, chunk := range chunks {
		name := fmt.Sprintf("%s.%d", sessionCookiePrefix, i)
		cookie := &fiber.Cookie{
			Name:     name,
			Value:    chunk,
			Path:     "/",
			HTTPOnly: true,
			Secure:   secure,
			SameSite: "Lax",
		}
		c.Cookie(cookie)
	}
	return nil
}

// slimSession keeps only the fields required to restore the session (middleware,
// ExtractAccessToken and supabase-js cookie restore), dropping the bulky
// Supabase `user` object (identities, factors, app_metadata, ...).
func slimSession(raw []byte) []byte {
	var session map[string]json.RawMessage
	if err := json.Unmarshal(raw, &session); err != nil {
		return raw
	}

	slim := map[string]any{}
	keep := []string{"access_token", "refresh_token", "token_type", "expires_in", "expires_at"}
	seen := false
	for _, k := range keep {
		if v, ok := session[k]; ok {
			slim[k] = v
			seen = true
		}
	}

	if userRaw, ok := session["user"]; ok {
		var user map[string]json.RawMessage
		if err := json.Unmarshal(userRaw, &user); err == nil {
			minimal := map[string]any{}
			for _, k := range []string{"id", "email"} {
				if v, ok := user[k]; ok {
					minimal[k] = v
				}
			}
			if len(minimal) > 0 {
				slim["user"] = minimal
			}
		}
	}

	if !seen {
		return raw
	}
	out, err := json.Marshal(slim)
	if err != nil {
		return raw
	}
	return out
}

func ClearSessionCookies(c *fiber.Ctx) {
	for i := 0; i < 10; i++ {
		name := fmt.Sprintf("%s.%d", sessionCookiePrefix, i)
		c.Cookie(&fiber.Cookie{
			Name:    name,
			Value:   "",
			Path:    "/",
			MaxAge:  -1,
			Expires: time.Unix(1, 0),
		})
	}
}

// TrustedDeviceCookieName is the cookie that holds the trusted-device token.
func TrustedDeviceCookieName() string { return "trusted_device" }
