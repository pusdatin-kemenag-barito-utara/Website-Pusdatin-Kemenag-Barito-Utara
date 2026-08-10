package auth

import (
	"github.com/gofiber/fiber/v2"

	"pusdatin/backend/internal/config"
	"pusdatin/backend/internal/database"
	"pusdatin/backend/internal/utils"
)

// HandlerDeps bundles everything handlers and middleware need.
type HandlerDeps struct {
	Cfg   *config.Config
	Store *database.Store
	Auth  *Client
	TD    *TrustedDeviceService
}

const sessionCtxKey = "session"

// Middleware resolves the session once per request and stores it in locals.
func Middleware(deps *HandlerDeps) fiber.Handler {
	return func(c *fiber.Ctx) error {
		session := ResolveSession(c.Context(), deps.Cfg, deps.Store, deps.Auth, c)
		c.Locals(sessionCtxKey, session)
		return c.Next()
	}
}

// GetSession retrieves the session context set by Middleware.
func GetSession(c *fiber.Ctx) *SessionContext {
	if s, ok := c.Locals(sessionCtxKey).(*SessionContext); ok {
		return s
	}
	return &SessionContext{IsAuthenticated: false, IsAdmin: false}
}

// AdminRequired protects routes that need an admin session.
func AdminRequired() fiber.Handler {
	return func(c *fiber.Ctx) error {
		session := GetSession(c)
		if !session.IsAdmin {
			return utils.Unauthorized(c, "Unauthorized")
		}
		return c.Next()
	}
}

// SuperAdminRequired protects routes limited to the central super admin.
func SuperAdminRequired() fiber.Handler {
	return func(c *fiber.Ctx) error {
		session := GetSession(c)
		if session.User == nil || session.User.Role != "super_admin" {
			return utils.Forbidden(c, "Forbidden: memerlukan akses Super Admin")
		}
		return c.Next()
	}
}
