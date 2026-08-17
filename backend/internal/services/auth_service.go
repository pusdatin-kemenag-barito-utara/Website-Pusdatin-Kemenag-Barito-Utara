package services

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"

	"pusdatin/backend/internal/auth"
	"pusdatin/backend/internal/config"
	"pusdatin/backend/internal/domain"
)

type AuthService struct {
	cfg      *config.Config
	userRepo domain.UserRepository
	tdRepo   domain.TrustedDeviceRepository
	auditRepo domain.AuditRepository
	idp      domain.IdentityProvider
	verifier domain.TurnstileVerifier
	td       *auth.TrustedDeviceService
}

func NewAuthService(
	cfg *config.Config,
	userRepo domain.UserRepository,
	tdRepo domain.TrustedDeviceRepository,
	auditRepo domain.AuditRepository,
	idp domain.IdentityProvider,
	verifier domain.TurnstileVerifier,
	td *auth.TrustedDeviceService,
) *AuthService {
	return &AuthService{
		cfg:       cfg,
		userRepo:  userRepo,
		tdRepo:    tdRepo,
		auditRepo: auditRepo,
		idp:       idp,
		verifier:  verifier,
		td:        td,
	}
}

type LoginResult struct {
	User         *domain.SessionUser `json:"user"`
	Token        string              `json:"token"`
	RefreshToken string              `json:"refreshToken"`
	MFARequired  bool                `json:"mfaRequired"`
	MFAEnrolled  bool                `json:"mfaEnrolled"`
	MFAFactorID  string              `json:"mfaFactorId,omitempty"`
	SSOLink      string              `json:"ssoLink,omitempty"`
	RawSession   []byte              `json:"-"`
}

func (s *AuthService) Login(ctx context.Context, email, password, turnstileToken, returnTo, clientIP, trustedCookie string) (*LoginResult, error) {
	if email == "" || password == "" || turnstileToken == "" {
		return nil, domain.ErrInvalidInput
	}

	if s.verifier != nil && !s.verifier.Verify(ctx, s.cfg.TurnstileSecretKey, turnstileToken, s.cfg.IsProduction) {
		return nil, domain.ErrSecurityCheckFail
	}

	token, err := s.idp.SignInWithPassword(ctx, email, password)
	if err != nil || token == nil || token.User == nil {
		return nil, domain.ErrInvalidCredentials
	}

	sessionCtx := s.BuildSessionContext(ctx, token.User)
	if !sessionCtx.IsAdmin || sessionCtx.User == nil {
		return nil, domain.ErrForbidden
	}

	_ = s.auditRepo.InsertAuditLog(ctx, "INSERT", "login:"+email, "kemenag_pusdatin", sessionCtx.User.Email, nil, nil, clientIP)

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
	if trustedCookie != "" {
		isTrusted = s.td.Verify(ctx, token.User.ID, trustedCookie)
	}

	res := &LoginResult{
		User:         sessionCtx.User,
		Token:        token.AccessToken,
		RefreshToken: token.RefreshToken,
		MFAEnrolled:  mfaEnrolled,
		MFAFactorID:  mfaFactorID,
		RawSession:   token.Raw,
	}

	cleanReturnTo := SanitizeReturnURL(returnTo)

	// In development mode, bypass MFA completely.
	// In production mode, require MFA unless the device is already trusted.
	if !s.cfg.IsProduction {
		res.MFARequired = false
	} else if !isTrusted {
		res.MFARequired = true
		return res, nil
	} else {
		res.MFARequired = false
	}

	if cleanReturnTo != "" {
		link, err := s.idp.GenerateMagicLink(ctx, sessionCtx.User.Email, cleanReturnTo)
		if err == nil && link != "" {
			res.SSOLink = link
		}
	}

	return res, nil
}

type MFAResult struct {
	SessionPayload []byte
	SSOLink        string
	TrustedCookie  string
	Success        bool
}

func (s *AuthService) CompleteMFA(ctx context.Context, accessToken, returnTo string, trustDevice bool, userAgent, clientIP string) (*MFAResult, error) {
	if accessToken == "" {
		return nil, domain.ErrUnauthorized
	}

	supaUser, err := s.idp.GetUser(ctx, accessToken)
	if err != nil || supaUser == nil || supaUser.ID == "" {
		return nil, domain.ErrUnauthorized
	}

	sessionCtx := s.BuildSessionContext(ctx, supaUser)

	sessionPayload, _ := json.Marshal(map[string]any{
		"access_token": accessToken,
		"token_type":   "bearer",
		"expires_in":   3600,
		"user":         supaUser,
	})

	var trustedCookieVal string
	if trustDevice && sessionCtx.User != nil && sessionCtx.User.ID != "" {
		cookieVal, err := s.td.Create(ctx, sessionCtx.User.ID, userAgent, clientIP)
		if err == nil {
			trustedCookieVal = cookieVal
		}
	}

	var ssoLink string
	cleanReturnTo := SanitizeReturnURL(returnTo)
	if cleanReturnTo != "" && sessionCtx.User != nil {
		link, err := s.idp.GenerateMagicLink(ctx, sessionCtx.User.Email, cleanReturnTo)
		if err == nil && link != "" {
			ssoLink = link
		}
	}

	return &MFAResult{
		SessionPayload: sessionPayload,
		SSOLink:        ssoLink,
		TrustedCookie:  trustedCookieVal,
		Success:        true,
	}, nil
}

func (s *AuthService) Logout(ctx context.Context, session *domain.SessionContext, forgetDevice bool, trustedCookie string) error {
	if forgetDevice && session != nil && session.User != nil && trustedCookie != "" {
		deviceID := strings.Split(trustedCookie, ".")[0]
		if deviceID != "" {
			_ = s.td.Revoke(ctx, deviceID, session.User.ID)
		}
	}
	return nil
}

type SessionResponse struct {
	Authenticated bool                `json:"authenticated"`
	User          *domain.SessionUser `json:"user"`
	Permissions   map[string]any      `json:"permissions,omitempty"`
	MFAValidated  bool                `json:"mfaValidated"`
}

func (s *AuthService) GetSessionState(ctx context.Context, session *domain.SessionContext, accessToken, trustedCookie string) *SessionResponse {
	if session == nil || !session.IsAuthenticated || session.User == nil {
		return &SessionResponse{Authenticated: false, User: nil}
	}

	mfaValidated := false
	if !s.cfg.IsProduction {
		mfaValidated = true
	} else if IsAAL2(accessToken) {
		mfaValidated = true
	} else if trustedCookie != "" {
		mfaValidated = s.td.Verify(ctx, session.User.ID, trustedCookie)
	}

	return &SessionResponse{
		Authenticated: true,
		User:          session.User,
		Permissions: map[string]any{
			"isAdmin": session.IsAdmin,
			"role":    session.User.Role,
		},
		MFAValidated: mfaValidated,
	}
}

func (s *AuthService) ResolveSession(ctx context.Context, accessToken string) *domain.SessionContext {
	if accessToken == "" {
		return &domain.SessionContext{User: nil, IsAuthenticated: false, IsAdmin: false}
	}

	supaUser, err := s.idp.GetUser(ctx, accessToken)
	if err != nil || supaUser == nil || supaUser.ID == "" {
		return &domain.SessionContext{User: nil, IsAuthenticated: false, IsAdmin: false}
	}
	return s.BuildSessionContext(ctx, supaUser)
}

func (s *AuthService) GenerateSSOJump(ctx context.Context, session *domain.SessionContext, returnTo string) (string, error) {
	cleanReturnTo := SanitizeReturnURL(returnTo)
	if cleanReturnTo == "" {
		return "", domain.ErrInvalidInput
	}
	if session == nil || !session.IsAuthenticated || session.User == nil {
		return "", domain.ErrUnauthorized
	}
	link, err := s.idp.GenerateMagicLink(ctx, session.User.Email, cleanReturnTo)
	if err != nil || link == "" {
		return "", fmt.Errorf("failed to generate SSO link: %w", err)
	}
	return link, nil
}

func (s *AuthService) BuildSessionContext(ctx context.Context, supaUser *domain.AuthUser) *domain.SessionContext {
	fail := func() *domain.SessionContext {
		return &domain.SessionContext{User: nil, IsAuthenticated: false, IsAdmin: false}
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
	if supaUser.Email != "" && strings.EqualFold(supaUser.Email, s.cfg.SuperAdminEmail) {
		isCentralSuperAdmin = true
	}

	role := "viewer"
	var profile *domain.User
	var perms []domain.AppPermission

	if isCentralSuperAdmin {
		role = "super_admin"
	} else {
		profile, _ = s.userRepo.GetUserByEmail(ctx, supaUser.Email)
		if profile != nil {
			if profile.Status == "inactive" {
				return fail()
			}
			role = profile.Role
			if role == "" {
				role = "viewer"
			}
			perms, _ = s.userRepo.GetUserPermissions(ctx, profile.ID)
		} else {
			return fail()
		}
	}
	if perms == nil {
		perms = []domain.AppPermission{}
	}

	name := "Admin"
	if profile != nil && profile.Name != "" {
		name = profile.Name
	} else if fn, ok := supaUser.UserMetadata["full_name"].(string); ok && fn != "" {
		name = fn
	} else if supaUser.Email != "" {
		name = strings.Split(supaUser.Email, "@")[0]
	}

	return &domain.SessionContext{
		User: &domain.SessionUser{
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

// Helpers
func SanitizeReturnURL(raw string) string {
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

func IsAAL2(accessToken string) bool {
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
