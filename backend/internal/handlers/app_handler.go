package handlers

import (
	"github.com/gofiber/fiber/v2"

	"pusdatin/backend/internal/domain"
	"pusdatin/backend/internal/services"
	"pusdatin/backend/internal/utils"
)

type AppHandler struct {
	appService *services.AppService
}

func NewAppHandler(appService *services.AppService) *AppHandler {
	return &AppHandler{appService: appService}
}

// ListApps GET /api/apps
func (h *AppHandler) ListApps(c *fiber.Ctx) error {
	apps, err := h.appService.ListApps(c.Context())
	if err != nil {
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, apps)
}

// CreateApp POST /api/apps
func (h *AppHandler) CreateApp(c *fiber.Ctx) error {
	var req services.CreateAppInput
	if err := body(c, &req); err != nil {
		return err
	}
	if req.ID == "" || req.Name == "" || req.Schema == "" {
		return utils.Bad(c, "ID, Nama, dan Schema Name wajib diisi")
	}

	actor := actorEmail(c)
	ip := clientIP(c)

	created, err := h.appService.CreateApp(c.Context(), actor, ip, req)
	if err != nil {
		if err == domain.ErrAlreadyExists {
			return utils.Bad(c, "ID Aplikasi sudah digunakan")
		}
		return utils.Internal(c, "Internal server error")
	}
	return utils.Created(c, created)
}

// UpdateApp PATCH /api/apps/:id
func (h *AppHandler) UpdateApp(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		Name      *string `json:"name"`
		URL       *string `json:"url"`
		Schema    *string `json:"schemaName"`
		SchemaURL *string `json:"schemaUrl"`
		Sort      *int32  `json:"sortOrder"`
		Desc      *string `json:"description"`
		Icon      *string `json:"icon"`
	}
	if err := body(c, &req); err != nil {
		return err
	}

	fields := map[string]any{}
	if req.Name != nil {
		fields["name"] = *req.Name
	}
	if req.URL != nil {
		fields["url"] = *req.URL
	}
	if req.Schema != nil {
		fields["schema_name"] = *req.Schema
	}
	if req.SchemaURL != nil {
		fields["schema_url"] = *req.SchemaURL
	}
	if req.Sort != nil {
		fields["sort_order"] = *req.Sort
	}
	if req.Desc != nil {
		fields["description"] = *req.Desc
	}
	if req.Icon != nil {
		fields["icon"] = *req.Icon
	}
	if len(fields) == 0 {
		return utils.Bad(c, "No data to update")
	}

	actor := actorEmail(c)
	ip := clientIP(c)

	if err := h.appService.UpdateApp(c.Context(), actor, ip, id, fields); err != nil {
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, map[string]any{"message": "App updated successfully"})
}

// DeleteApp DELETE /api/apps/:id
func (h *AppHandler) DeleteApp(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return utils.Bad(c, "ID aplikasi tidak valid")
	}

	actor := actorEmail(c)
	ip := clientIP(c)

	if err := h.appService.DeleteApp(c.Context(), actor, ip, id); err != nil {
		return utils.Internal(c, "Gagal menghapus aplikasi")
	}
	return utils.OK(c, map[string]any{"message": "Aplikasi berhasil dihapus"})
}

// UpdateAppStatus PUT /api/apps/:id/status
func (h *AppHandler) UpdateAppStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		Status string `json:"status"`
	}
	if err := body(c, &req); err != nil {
		return err
	}
	if !services.ValidAppStatus(req.Status) {
		return utils.Bad(c, "Status tidak valid")
	}

	actor := actorEmail(c)
	ip := clientIP(c)

	if err := h.appService.UpdateAppStatus(c.Context(), actor, ip, id, req.Status); err != nil {
		if err == domain.ErrNotFound {
			return utils.NotFound(c, "Aplikasi tidak ditemukan")
		}
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, map[string]any{"ok": true})
}

// BulkUpdateAppStatus POST /api/apps/bulk-status
func (h *AppHandler) BulkUpdateAppStatus(c *fiber.Ctx) error {
	var req struct {
		Status string `json:"status"`
	}
	if err := body(c, &req); err != nil {
		return err
	}
	if !services.ValidAppStatus(req.Status) {
		return utils.Bad(c, "Status tidak valid")
	}

	actor := actorEmail(c)
	ip := clientIP(c)

	if err := h.appService.BulkUpdateAppStatus(c.Context(), actor, ip, req.Status); err != nil {
		return utils.Internal(c, "Gagal mengubah status semua aplikasi")
	}
	return utils.OK(c, map[string]any{"ok": true, "message": "Semua aplikasi berhasil diubah ke mode " + req.Status})
}

// PublicAppStatus GET /api/public/apps/:id/status (Public / CORS)
func (h *AppHandler) PublicAppStatus(c *fiber.Ctx) error {
	c.Set("Access-Control-Allow-Origin", "*")
	c.Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	c.Set("Access-Control-Allow-Headers", "Content-Type")

	if c.Method() == fiber.MethodOptions {
		return c.SendStatus(fiber.StatusNoContent)
	}

	id := c.Params("id")
	status, err := h.appService.GetAppStatus(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{"status": "online", "_debug": "not_found", "requestedId": id})
	}
	return c.JSON(fiber.Map{"status": status})
}
