package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	"pusdatin/backend/internal/database"
	"pusdatin/backend/internal/utils"
)

func (h *Handler) ListAuditLogs(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 50
	}

	f := database.AuditFilter{
		Action:       c.Query("action"),
		TargetSchema: c.Query("targetSchema"),
		StartDate:    c.Query("startDate"),
		EndDate:      c.Query("endDate"),
		Search:       c.Query("search"),
		Limit:        limit,
		Offset:       (page - 1) * limit,
	}

	logs, total, err := h.Store.ListAuditLogs(c.Context(), f)
	if err != nil {
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, fiber.Map{"data": logs, "total": total})
}

func (h *Handler) DeleteAuditLogs(c *fiber.Ctx) error {
	targetSchema := c.Query("targetSchema")
	if _, err := h.Store.DeleteAuditLogs(c.Context(), targetSchema); err != nil {
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, map[string]any{"message": "Audit logs deleted successfully"})
}

func (h *Handler) ReportActivity(c *fiber.Ctx) error {
	days, _ := strconv.Atoi(c.Query("days", "7"))
	if days < 1 {
		days = 1
	}
	points, err := h.Store.ReportActivity(c.Context(), days)
	if err != nil {
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, points)
}

func (h *Handler) ReportAppSummary(c *fiber.Ctx) error {
	items, err := h.Store.ReportAppSummary(c.Context())
	if err != nil {
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, items)
}

func (h *Handler) DashboardStats(c *fiber.Ctx) error {
	stats, err := h.Store.DashboardStats(c.Context())
	if err != nil {
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, stats)
}
