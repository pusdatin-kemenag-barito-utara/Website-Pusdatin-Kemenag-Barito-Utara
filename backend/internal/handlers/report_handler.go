package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v3"

	"pusdatin/backend/internal/domain"
	"pusdatin/backend/internal/services"
	"pusdatin/backend/internal/utils"
)

type ReportHandler struct {
	reportService *services.ReportService
}

func NewReportHandler(reportService *services.ReportService) *ReportHandler {
	return &ReportHandler{reportService: reportService}
}

// ListAuditLogs GET /api/audit-logs
func (h *ReportHandler) ListAuditLogs(c fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	}

	f := domain.AuditFilter{
		Action:       c.Query("action"),
		TargetSchema: c.Query("targetSchema"),
		StartDate:    c.Query("startDate"),
		EndDate:      c.Query("endDate"),
		Search:       c.Query("search"),
		Limit:        limit,
		Offset:       (page - 1) * limit,
	}

	logs, total, err := h.reportService.ListAuditLogs(c.Context(), f)
	if err != nil {
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, fiber.Map{"data": logs, "total": total})
}

// DeleteAuditLogs DELETE /api/audit-logs
func (h *ReportHandler) DeleteAuditLogs(c fiber.Ctx) error {
	var req struct {
		IDs          []string `json:"ids"`
		TargetSchema string   `json:"targetSchema"`
	}
	_ = c.Bind().Body(&req)

	if targetSchema := c.Query("targetSchema"); targetSchema != "" && req.TargetSchema == "" {
		req.TargetSchema = targetSchema
	}

	if len(req.IDs) > 0 {
		count, err := h.reportService.DeleteAuditLogsBatch(c.Context(), req.IDs)
		if err != nil {
			return utils.Internal(c, "Gagal menghapus log audit terpilih")
		}
		return utils.OK(c, fiber.Map{
			"message":      "Log audit terpilih berhasil dihapus",
			"deletedCount": count,
		})
	}

	count, err := h.reportService.DeleteAuditLogs(c.Context(), req.TargetSchema)
	if err != nil {
		return utils.Internal(c, "Gagal menghapus log audit")
	}
	return utils.OK(c, fiber.Map{
		"message":      "Log audit berhasil dihapus",
		"deletedCount": count,
	})
}

// ReportActivity GET /api/reports/activity
func (h *ReportHandler) ReportActivity(c fiber.Ctx) error {
	days, _ := strconv.Atoi(c.Query("days", "7"))
	points, err := h.reportService.GetActivityReport(c.Context(), days)
	if err != nil {
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, points)
}

// ReportAppSummary GET /api/reports/app-summary
func (h *ReportHandler) ReportAppSummary(c fiber.Ctx) error {
	items, err := h.reportService.GetAppSummaryReport(c.Context())
	if err != nil {
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, items)
}

// DashboardStats GET /api/dashboard/stats
func (h *ReportHandler) DashboardStats(c fiber.Ctx) error {
	stats, err := h.reportService.GetDashboardStats(c.Context())
	if err != nil {
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, stats)
}

// LandingStatsHandler GET /api/landing/stats (public)
func (h *ReportHandler) LandingStatsHandler(c fiber.Ctx) error {
	data, err := h.reportService.GetLandingData(c.Context())
	if err != nil {
		return utils.OK(c, fiber.Map{
			"stats": map[string]any{
				"totalAppsCount":      0,
				"onlineAppsCount":     0,
				"totalAnnouncements":  0,
				"totalAuditLogs":      0,
				"superAdminCount":     1,
				"systemHealthPercent": 100,
			},
			"apps": []any{},
		})
	}
	return utils.OK(c, fiber.Map{
		"stats": data.Stats,
		"apps":  data.Apps,
	})
}
