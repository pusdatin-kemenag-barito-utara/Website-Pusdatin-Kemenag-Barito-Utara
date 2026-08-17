package handlers

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"

	"pusdatin/backend/internal/auth"
	"pusdatin/backend/internal/config"
	"pusdatin/backend/internal/domain"
	"pusdatin/backend/internal/middleware"
	"pusdatin/backend/internal/services"
	"pusdatin/backend/internal/utils"
)

type AuthHandler struct {
	cfg         *config.Config
	authService *services.AuthService
}

func NewAuthHandler(cfg *config.Config, authService *services.AuthService) *AuthHandler {
	return &AuthHandler{
		cfg:         cfg,
		authService: authService,
	}
}

// LoginHandler POST /api/auth/login
func (h *AuthHandler) LoginHandler(c *fiber.Ctx) error {
	var req struct {
		Email          string `json:"email"`
		Password       string `json:"password"`
		TurnstileToken string `json:"turnstileToken"`
		ReturnTo       string `json:"returnTo"`
	}
	if err := body(c, &req); err != nil {
		return err
	}

	ip := clientIP(c)
	trustedCookie := c.Cookies(auth.TrustedDeviceCookieName())

	res, err := h.authService.Login(c.Context(), req.Email, req.Password, req.TurnstileToken, req.ReturnTo, ip, trustedCookie)
	if err != nil {
		switch err {
		case domain.ErrInvalidInput:
			return utils.Bad(c, "Email, password, dan verifikasi keamanan wajib diisi")
		case domain.ErrSecurityCheckFail:
			return utils.Bad(c, "Verifikasi keamanan gagal. Silakan coba lagi.")
		case domain.ErrInvalidCredentials:
			return utils.Unauthorized(c, "Email atau password salah")
		case domain.ErrForbidden:
			return utils.Forbidden(c, "Akun ini tidak memiliki akses ke portal Pusdatin")
		default:
			return utils.Internal(c, "Terjadi kesalahan server")
		}
	}

	// Clear old chunked session cookies first to prevent Cookie header accumulation
	auth.ClearSessionCookies(c)

	// Write session cookies matching @supabase/ssr format
	if err := auth.WriteSessionCookies(c, res.RawSession, h.cfg.IsProduction); err != nil {
		fmt.Printf("[API AUTH ERROR] WriteSessionCookies failed for email %s: %v\n", req.Email, err)
		return utils.Internal(c, "Terjadi kesalahan server")
	}

	payload := fiber.Map{
		"user":         res.User,
		"token":        res.Token,
		"refreshToken": res.RefreshToken,
		"mfaRequired":  res.MFARequired,
		"mfaEnrolled":  res.MFAEnrolled,
	}
	if res.MFAFactorID != "" {
		payload["mfaFactorId"] = res.MFAFactorID
	}
	if res.SSOLink != "" {
		payload["ssoLink"] = res.SSOLink
	}

	return utils.OK(c, payload)
}

// LogoutHandler POST /api/auth/logout
func (h *AuthHandler) LogoutHandler(c *fiber.Ctx) error {
	var req struct {
		ForgetDevice bool `json:"forgetDevice"`
	}
	if err := body(c, &req); err != nil {
		req.ForgetDevice = false
	}

	session := middleware.GetSession(c)
	trustedCookie := c.Cookies(auth.TrustedDeviceCookieName())

	_ = h.authService.Logout(c.Context(), session, req.ForgetDevice, trustedCookie)

	if req.ForgetDevice {
		c.Cookie(&fiber.Cookie{
			Name:    auth.TrustedDeviceCookieName(),
			Value:   "",
			Path:    "/",
			MaxAge:  -1,
			Expires: time.Unix(1, 0),
		})
	}

	auth.ClearSessionCookies(c)
	return utils.OK(c, map[string]any{"ok": true})
}

// MFACompleteHandler POST /api/auth/mfa/complete
func (h *AuthHandler) MFACompleteHandler(c *fiber.Ctx) error {
	var req struct {
		ReturnTo    string `json:"returnTo"`
		TrustDevice bool   `json:"trustDevice"`
		AccessToken string `json:"accessToken"`
	}
	if err := body(c, &req); err != nil {
		return err
	}

	accessToken := auth.ExtractAccessToken(c)
	if accessToken == "" && req.AccessToken != "" {
		accessToken = req.AccessToken
	}

	if accessToken == "" {
		return utils.Unauthorized(c, "Tidak ada sesi OTP aktif")
	}

	if !services.IsAAL2(accessToken) && req.AccessToken != "" && services.IsAAL2(req.AccessToken) {
		accessToken = req.AccessToken
	}

	userAgent := c.Get("User-Agent")
	ip := clientIP(c)

	res, err := h.authService.CompleteMFA(c.Context(), accessToken, req.ReturnTo, req.TrustDevice, userAgent, ip)
	if err != nil {
		return utils.Unauthorized(c, "Sesi OTP tidak valid atau kedaluwarsa")
	}

	_ = auth.WriteSessionCookies(c, res.SessionPayload, h.cfg.IsProduction)

	if res.TrustedCookie != "" {
		c.Cookie(&fiber.Cookie{
			Name:     auth.TrustedDeviceCookieName(),
			Value:    res.TrustedCookie,
			Path:     "/",
			HTTPOnly: true,
			Secure:   h.cfg.IsProduction,
			MaxAge:   30 * 24 * 60 * 60,
			SameSite: "Lax",
		})
	}

	if res.SSOLink != "" {
		return utils.OK(c, fiber.Map{"ssoLink": res.SSOLink})
	}

	return utils.OK(c, map[string]any{"success": true})
}

// SessionHandler GET /api/auth/session
func (h *AuthHandler) SessionHandler(c *fiber.Ctx) error {
	session := middleware.GetSession(c)
	accessToken := auth.ExtractAccessToken(c)
	trustedCookie := c.Cookies(auth.TrustedDeviceCookieName())

	state := h.authService.GetSessionState(c.Context(), session, accessToken, trustedCookie)
	return utils.OK(c, state)
}

// SSOJumpHandler GET /api/sso/jump?returnTo=/some/path
func (h *AuthHandler) SSOJumpHandler(c *fiber.Ctx) error {
	returnTo := c.Query("returnTo")
	cleanReturnTo := services.SanitizeReturnURL(returnTo)
	if cleanReturnTo == "" {
		return utils.Bad(c, "Parameter returnTo wajib berupa jalur internal")
	}

	session := middleware.GetSession(c)
	if !session.IsAuthenticated || session.User == nil {
		loginURL := "/login"
		if returnTo != "" {
			loginURL += "?returnTo=" + returnTo
		}
		return c.Redirect(loginURL, fiber.StatusTemporaryRedirect)
	}

	link, err := h.authService.GenerateSSOJump(c.Context(), session, cleanReturnTo)
	if err != nil || link == "" {
		return utils.Internal(c, "Gagal membuat link SSO")
	}
	return c.Redirect(link, fiber.StatusTemporaryRedirect)
}
