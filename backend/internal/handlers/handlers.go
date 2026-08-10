package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"

	"pusdatin/backend/internal/auth"
	"pusdatin/backend/internal/config"
	"pusdatin/backend/internal/database"
	"pusdatin/backend/internal/utils"
)

// Handler bundles the dependencies for all HTTP handlers.
type Handler struct {
	Cfg   *config.Config
	Store *database.Store
	Auth  *auth.Client
	TD    *auth.TrustedDeviceService
}

func New(cfg *config.Config, store *database.Store, ac *auth.Client, td *auth.TrustedDeviceService) *Handler {
	return &Handler{Cfg: cfg, Store: store, Auth: ac, TD: td}
}

// body decodes a JSON request body into v (empty body allowed).
func body(c *fiber.Ctx, v any) error {
	if len(c.Body()) == 0 {
		return nil
	}
	if err := c.BodyParser(v); err != nil {
		return utils.Bad(c, "Format body tidak valid")
	}
	return nil
}

// ip extracts the client IP using the same precedence as lib/rate-limit.ts.
func ip(c *fiber.Ctx) string {
	if xff := c.Get("X-Forwarded-For"); xff != "" {
		parts := splitComma(xff)
		for _, p := range parts {
			if p != "" {
				return p
			}
		}
	}
	if xr := c.Get("X-Real-IP"); xr != "" {
		return xr
	}
	return c.IP()
}

func splitComma(s string) []string {
	out := []string{}
	cur := ""
	for i := 0; i < len(s); i++ {
		if s[i] == ',' {
			out = append(out, cur)
			cur = ""
		} else {
			cur += string(s[i])
		}
	}
	out = append(out, cur)
	return out
}

// recordAudit mirrors lib/audit.ts (errors are swallowed, never block the caller).
func (h *Handler) recordAudit(c *fiber.Ctx, action, target, performedBy string, before, after any) {
	_ = h.Store.InsertAuditLog(c.Context(), action, target, "kemenag_pusdatin", performedBy, before, after, ip(c))
}

// nowISO returns the current time in JS Date.prototype.toISOString() format.
func nowISO() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000Z")
}

var _ = context.Background
