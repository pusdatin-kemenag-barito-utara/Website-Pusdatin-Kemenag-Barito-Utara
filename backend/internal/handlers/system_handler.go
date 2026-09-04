package handlers

import (
	"github.com/gofiber/fiber/v3"

	"pusdatin/backend/internal/services"
	"pusdatin/backend/internal/utils"
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

// RealtimeMetrics GET /api/system/realtime (admin)
func (h *SystemHandler) RealtimeMetrics(c fiber.Ctx) error {
	data, err := h.systemService.CollectRealtime(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch realtime metrics"})
	}
	return c.JSON(data)
}

// SystemHealth GET /api/system/health (admin)
func (h *SystemHandler) SystemHealth(c fiber.Ctx) error {
	latest, err := h.systemService.GetLatestHealth(c.Context())
	if err != nil {
		return utils.OK(c, fiber.Map{"cpu": 0, "ram": 0, "storage": 0, "uptime": "N/A"})
	}
	return utils.OK(c, latest)
}
