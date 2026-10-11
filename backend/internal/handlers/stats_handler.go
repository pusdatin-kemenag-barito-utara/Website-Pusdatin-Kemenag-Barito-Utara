package handlers

import (
	"github.com/gofiber/fiber/v3"

	"pusdatin/backend/internal/services"
	"pusdatin/backend/internal/utils"
)

type StatsHandler struct {
	statsService *services.StatsService
}

func NewStatsHandler(statsService *services.StatsService) *StatsHandler {
	return &StatsHandler{statsService: statsService}
}

// DashboardStats GET /api/dashboard/stats
func (h *StatsHandler) DashboardStats(c fiber.Ctx) error {
	stats, err := h.statsService.GetDashboardStats(c.Context())
	if err != nil {
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, stats)
}

// LandingStatsHandler GET /api/landing/stats (public)
func (h *StatsHandler) LandingStatsHandler(c fiber.Ctx) error {
	data, err := h.statsService.GetLandingData(c.Context())
	if err != nil {
		return utils.OK(c, fiber.Map{
			"stats": map[string]any{
				"totalAppsCount":      0,
				"onlineAppsCount":     0,
				"totalAnnouncements":  0,
				"superAdminCount":     1,
				"systemHealthPercent": 100,
			},
			"apps": []any{},
		})
	}
	return utils.OK(c, data)
}
