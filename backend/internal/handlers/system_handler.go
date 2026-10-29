package handlers

import (
	"github.com/gofiber/fiber/v3"

	"pusdatin/backend/internal/services"
)

type SystemHandler struct {
	systemService *services.SystemService
}

func NewSystemHandler(systemService *services.SystemService) *SystemHandler {
	return &SystemHandler{systemService: systemService}
}

// HealthHandler GET /api/health and GET /health (public)
// Returns 200 for container liveness health checks.
// If ?ready=1 is passed, it acts as a strict readiness probe requiring database connection.
func (h *SystemHandler) HealthHandler(c fiber.Ctx) error {
	ts := nowISO()
	dbStatus := "ok"
	if err := h.systemService.PingDatabase(c.Context()); err != nil {
		dbStatus = "connecting"
		if c.Query("ready") == "1" {
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
				"status":    "error",
				"database":  "disconnected",
				"message":   "Database connection failed",
				"timestamp": ts,
			})
		}
	}
	return c.JSON(fiber.Map{
		"status":    "ok",
		"database":  dbStatus,
		"timestamp": ts,
	})
}
