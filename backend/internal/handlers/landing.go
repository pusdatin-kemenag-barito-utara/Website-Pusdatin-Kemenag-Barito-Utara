package handlers

import (
	"github.com/gofiber/fiber/v2"

	"pusdatin/backend/internal/database"
	"pusdatin/backend/internal/utils"
)

// LandingStatsHandler GET /api/landing/stats (public)
// Returns the 6 landing counters plus the list of online apps in one call,
// mirroring what the old (landing)/page.tsx and layanan/page.tsx computed.
func (h *Handler) LandingStatsHandler(c *fiber.Ctx) error {
	stats, err := h.Store.LandingStats(c.Context())
	if err != nil {
		return utils.OK(c, fiber.Map{
			"stats": map[string]any{
				"totalAppsCount":    0,
				"layananMasyarakat": 0,
				"layananPegawai":    0,
				"totalAdmin":        0,
				"totalPegawai":      0,
				"totalMasyarakat":   0,
			},
			"apps": []any{},
		})
	}

	apps, err := h.Store.ListOnlineApps(c.Context())
	if err != nil {
		apps = []*database.App{}
	}
	if apps == nil {
		apps = []*database.App{}
	}

	return utils.OK(c, fiber.Map{"stats": stats, "apps": apps})
}
