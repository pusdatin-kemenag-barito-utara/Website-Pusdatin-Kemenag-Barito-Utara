package handlers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"

	"pusdatin/backend/internal/auth"
	"pusdatin/backend/internal/utils"
)

// LoginHandler POST /api/auth/login
func (h *Handler) LoginHandler(c *fiber.Ctx) error {
	var req struct {
		Email          string `json:"email"`
		Password       string `json:"password"`
		TurnstileToken string `json:"turnstileToken"`
		ReturnTo       string `json:"returnTo"`
	}
	if err := body(c, &req); err != nil {
		return err
	}
	if req.Email == "" || req.Password == "" || req.TurnstileToken == "" {
		fmt.Printf("[API AUTH ERROR] Missing required fields for email: %s\n", req.Email)
		return utils.Bad(c, "Email, password, dan verifikasi keamanan wajib diisi")
	}

	if !auth.VerifyTurnstile(c.Context(), h.Cfg.TurnstileSecretKey, req.TurnstileToken, h.Cfg.IsProduction) {
		fmt.Printf("[API AUTH ERROR] Turnstile verification failed for email: %s\n", req.Email)
		return utils.Bad(c, "Verifikasi keamanan gagal. Silakan coba lagi.")
	}

	token, err := h.Auth.SignInWithPassword(c.Context(), req.Email, req.Password)
	if err != nil || token == nil || token.User == nil {
		fmt.Printf("[API AUTH ERROR] Invalid credentials or Supabase Auth error for email %s: %v\n", req.Email, err)
		return utils.Unauthorized(c, "Email atau password salah")
	}

	session := auth.BuildSessionContext(c.Context(), h.Cfg, h.Store, token.User)
	if !session.IsAdmin || session.User == nil {
		fmt.Printf("[API AUTH ERROR] Forbidden access for user %s (not admin)\n", req.Email)
		return utils.Forbidden(c, "Akun ini tidak memiliki akses ke portal Pusdatin")
	}

	// Write the Supabase session cookies (mirrors @supabase/ssr format).
	if err := auth.WriteSessionCookies(c, token.Raw, h.Cfg.IsProduction); err != nil {
		fmt.Printf("[API AUTH ERROR] WriteSessionCookies failed for email %s: %v\n", req.Email, err)
		return utils.Internal(c, "Terjadi kesalahan server")
	}

	h.recordAudit(c, "INSERT", "login:"+req.Email, session.User.Email, nil, nil)

	mfaEnrolled := false
	mfaFactorID := ""
	for _, f := range token.User.Factors {
		if f.FactorType == "totp" && f.Status == "verified" {
			mfaEnrolled = true
			mfaFactorID = f.ID
			break
		}
	}

	isTrusted := false
	if trusted := c.Cookies(auth.TrustedDeviceCookieName()); trusted != "" {
		isTrusted = h.TD.Verify(c.Context(), token.User.ID, trusted)
	}

	returnTo := sanitizeReturnUrl(req.ReturnTo)

	if !isTrusted {
		return utils.OK(c, fiber.Map{
			"user":         session.User,
			"token":        token.AccessToken,
			"refreshToken": token.RefreshToken,
			"mfaRequired":  true,
			"mfaEnrolled":  mfaEnrolled,
			"mfaFactorId":  mfaFactorID,
		})
	}

	if returnTo != "" {
		link, err := h.Auth.GenerateMagicLink(c.Context(), session.User.Email, returnTo)
		if err == nil && link != "" {
			return utils.OK(c, fiber.Map{"ssoLink": link})
		}
	}

	return utils.OK(c, fiber.Map{
		"user":         session.User,
		"token":        token.AccessToken,
		"refreshToken": token.RefreshToken,
		"mfaRequired":  false,
		"mfaEnrolled":  mfaEnrolled,
	})
}

// LogoutHandler POST /api/auth/logout
func (h *Handler) LogoutHandler(c *fiber.Ctx) error {
	var req struct {
		ForgetDevice bool `json:"forgetDevice"`
	}
	if err := body(c, &req); err != nil {
		req.ForgetDevice = false
	}

	session := auth.GetSession(c)
	trustedCookie := c.Cookies(auth.TrustedDeviceCookieName())

	if req.ForgetDevice && session.User != nil && trustedCookie != "" {
		deviceID := strings.Split(trustedCookie, ".")[0]
		if deviceID != "" {
			_ = h.TD.Revoke(c.Context(), deviceID, session.User.ID)
		}
		c.Cookie(&fiber.Cookie{Name: auth.TrustedDeviceCookieName(), Value: "", Path: "/", MaxAge: -1, Expires: time.Unix(1, 0)})
	}

	auth.ClearSessionCookies(c)
	return utils.OK(c, map[string]any{"ok": true})
}

// MFACompleteHandler POST /api/auth/mfa/complete
func (h *Handler) MFACompleteHandler(c *fiber.Ctx) error {
	var req struct {
		ReturnTo    string `json:"returnTo"`
		TrustDevice bool   `json:"trustDevice"`
	}
	if err := body(c, &req); err != nil {
		return err
	}

	session := auth.GetSession(c)
	if session == nil || !session.IsAuthenticated || session.User == nil {
		return utils.Unauthorized(c, "Tidak ada sesi aktif")
	}

	accessToken := auth.ExtractAccessToken(c)
	if !isAAL2(accessToken) {
		return utils.Forbidden(c, "Sesi belum divalidasi dengan OTP")
	}

	// Persist the upgraded AAL2 access token in session cookies
	_ = auth.WriteSessionCookies(c, []byte(accessToken), h.Cfg.IsProduction)

	if req.TrustDevice {
		userAgent := c.Get("User-Agent")
		ipAddress := ip(c)
		cookieValue, err := h.TD.Create(c.Context(), session.User.ID, userAgent, ipAddress)
		if err != nil {
			return utils.Internal(c, "Terjadi kesalahan server")
		}
		c.Cookie(&fiber.Cookie{
			Name:     auth.TrustedDeviceCookieName(),
			Value:    cookieValue,
			Path:     "/",
			HTTPOnly: true,
			Secure:   h.Cfg.IsProduction,
			MaxAge:   30 * 24 * 60 * 60,
			SameSite: "Lax",
		})
	}

	returnTo := sanitizeReturnUrl(req.ReturnTo)
	if returnTo != "" {
		link, err := h.Auth.GenerateMagicLink(c.Context(), session.User.Email, returnTo)
		if err == nil && link != "" {
			return utils.OK(c, fiber.Map{"ssoLink": link})
		}
	}

	return utils.OK(c, map[string]any{"success": true})
}

// SessionHandler GET /api/auth/session
func (h *Handler) SessionHandler(c *fiber.Ctx) error {
	session := auth.GetSession(c)
	if !session.IsAuthenticated || session.User == nil {
		return utils.OK(c, fiber.Map{"authenticated": false, "user": nil})
	}

	mfaValidated := false
	if isAAL2(auth.ExtractAccessToken(c)) {
		mfaValidated = true
	} else if trusted := c.Cookies(auth.TrustedDeviceCookieName()); trusted != "" {
		mfaValidated = h.TD.Verify(c.Context(), session.User.ID, trusted)
	}

	return utils.OK(c, fiber.Map{
		"authenticated": true,
		"user":          session.User,
		"permissions": fiber.Map{
			"isAdmin": session.IsAdmin,
			"role":    session.User.Role,
		},
		"mfaValidated": mfaValidated,
	})
}

// isAAL2 checks the `aal` claim of the access token JWT.
func isAAL2(accessToken string) bool {
	if accessToken == "" {
		return false
	}
	parts := strings.Split(accessToken, ".")
	if len(parts) < 2 {
		return false
	}
	payload := strings.ReplaceAll(parts[1], "-", "+")
	payload = strings.ReplaceAll(payload, "_", "/")
	switch len(payload) % 4 {
	case 2:
		payload += "=="
	case 3:
		payload += "="
	}
	raw, err := base64.StdEncoding.DecodeString(payload)
	if err != nil {
		return false
	}
	var claims struct {
		AAL string `json:"aal"`
	}
	if err := json.Unmarshal(raw, &claims); err != nil {
		return false
	}
	return claims.AAL == "aal2"
}

func sanitizeReturnUrl(raw string) string {
	if raw == "" {
		return ""
	}
	if !strings.HasPrefix(raw, "/") || strings.HasPrefix(raw, "//") || strings.HasPrefix(raw, "/\\") {
		return ""
	}
	if strings.HasPrefix(raw, "/login") || strings.HasPrefix(raw, "/maintenance") {
		return ""
	}
	return raw
}
