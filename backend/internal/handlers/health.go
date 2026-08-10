package handlers

import (
	"github.com/gofiber/fiber/v2"
)

// HealthHandler GET /api/health — pings the database like the old route.
func (h *Handler) HealthHandler(c *fiber.Ctx) error {
	ts := nowISO()
	if err := h.Store.Ping(c.Context()); err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"status":    "error",
			"message":   "Database connection failed",
			"timestamp": ts,
		})
	}
	return c.JSON(fiber.Map{"status": "ok", "timestamp": ts})
}
