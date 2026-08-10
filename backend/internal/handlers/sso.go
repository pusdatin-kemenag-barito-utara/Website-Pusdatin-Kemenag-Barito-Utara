package handlers

import (
	"pusdatin/backend/internal/auth"
	"pusdatin/backend/internal/utils"
	"github.com/gofiber/fiber/v2"
)

// SSOJumpHandler GET /api/sso/jump?returnTo=/some/path
// Generates a Supabase magic link redirect for the authenticated admin,
// mirroring the old route.ts.
func (h *Handler) SSOJumpHandler(c *fiber.Ctx) error {
	returnTo := sanitizeReturnUrl(c.Query("returnTo"))
	if returnTo == "" {
		return utils.Bad(c, "Parameter returnTo wajib berupa jalur internal")
	}

	session := auth.GetSession(c)
	if !session.IsAuthenticated || session.User == nil {
		loginURL := "/login"
		if c.Query("returnTo") != "" {
			loginURL += "?returnTo=" + c.Query("returnTo")
		}
		return c.Redirect(loginURL, fiber.StatusTemporaryRedirect)
	}

	link, err := h.Auth.GenerateMagicLink(c.Context(), session.User.Email, returnTo)
	if err != nil || link == "" {
		return utils.Internal(c, "Gagal membuat link SSO")
	}
	return c.Redirect(link, fiber.StatusTemporaryRedirect)
}
