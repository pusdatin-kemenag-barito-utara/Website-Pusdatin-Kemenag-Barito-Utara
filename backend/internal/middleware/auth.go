package middleware

import (
	"github.com/gofiber/fiber/v2"

	"pusdatin/backend/internal/auth"
	"pusdatin/backend/internal/domain"
	"pusdatin/backend/internal/services"
	"pusdatin/backend/internal/utils"
)

const sessionCtxKey = "session"

// AuthMiddleware resolves the current session from request cookies and populates fiber.Locals.
func AuthMiddleware(authService *services.AuthService) fiber.Handler {
	return func(c *fiber.Ctx) error {
		token := auth.ExtractAccessToken(c)
		session := authService.ResolveSession(c.Context(), token)
		c.Locals(sessionCtxKey, session)
		return c.Next()
	}
}

// GetSession extracts the resolved domain.SessionContext from fiber.Locals.
func GetSession(c *fiber.Ctx) *domain.SessionContext {
	if s, ok := c.Locals(sessionCtxKey).(*domain.SessionContext); ok && s != nil {
		return s
	}
	return &domain.SessionContext{IsAuthenticated: false, IsAdmin: false}
}

// AdminRequired enforces that the requesting session has an admin role.
func AdminRequired() fiber.Handler {
	return func(c *fiber.Ctx) error {
		session := GetSession(c)
		if !session.IsAdmin {
			return utils.Unauthorized(c, "Unauthorized")
		}
		return c.Next()
	}
}

// SuperAdminRequired enforces that the requesting session has the super_admin role.
func SuperAdminRequired() fiber.Handler {
	return func(c *fiber.Ctx) error {
		session := GetSession(c)
		if session.User == nil || session.User.Role != "super_admin" {
			return utils.Forbidden(c, "Forbidden: memerlukan akses Super Admin")
		}
		return c.Next()
	}
}
