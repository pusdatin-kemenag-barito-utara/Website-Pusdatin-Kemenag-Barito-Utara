package handlers

import (
	"github.com/gofiber/fiber/v2"

	"pusdatin/backend/internal/services"
	"pusdatin/backend/internal/utils"
)

type SystemHandler struct {
	systemService *services.SystemService
}

func NewSystemHandler(systemService *services.SystemService) *SystemHandler {
	return &SystemHandler{systemService: systemService}
}

// HealthHandler GET /api/health (public)
func (h *SystemHandler) HealthHandler(c *fiber.Ctx) error {
	ts := nowISO()
	if err := h.systemService.PingDatabase(c.Context()); err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"status":    "error",
			"message":   "Database connection failed",
			"timestamp": ts,
		})
	}
	return c.JSON(fiber.Map{"status": "ok", "timestamp": ts})
}

// RealtimeMetrics GET /api/system/realtime (admin)
func (h *SystemHandler) RealtimeMetrics(c *fiber.Ctx) error {
	data, err := h.systemService.CollectRealtime(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch realtime metrics"})
	}
	return c.JSON(data)
}

// SystemHealth GET /api/system/health (admin)
func (h *SystemHandler) SystemHealth(c *fiber.Ctx) error {
	latest, err := h.systemService.GetLatestHealth(c.Context())
	if err != nil {
		return utils.OK(c, fiber.Map{"cpu": 0, "ram": 0, "storage": 0, "uptime": "N/A"})
	}
	return utils.OK(c, latest)
}
