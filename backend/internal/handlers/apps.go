package handlers

import (
	"github.com/gofiber/fiber/v2"

	"pusdatin/backend/internal/auth"
	"pusdatin/backend/internal/database"
	"pusdatin/backend/internal/utils"
)

func (h *Handler) ListApps(c *fiber.Ctx) error {
	apps, err := h.Store.ListApps(c.Context())
	if err != nil {
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, apps)
}

func (h *Handler) CreateApp(c *fiber.Ctx) error {
	var req struct {
		ID       string  `json:"id"`
		Name     string  `json:"name"`
		Desc     *string `json:"description"`
		Icon     *string `json:"icon"`
		URL      *string `json:"url"`
		Schema   string  `json:"schemaName"`
		SchemaURL *string `json:"schemaUrl"`
		Status   string  `json:"status"`
		Sort     *int32  `json:"sortOrder"`
	}
	if err := body(c, &req); err != nil {
		return err
	}
	if req.ID == "" || req.Name == "" || req.Schema == "" {
		return utils.Bad(c, "ID, Nama, dan Schema Name wajib diisi")
	}

	exists, err := h.Store.AppExists(c.Context(), req.ID)
	if err != nil {
		return utils.Internal(c, "Internal server error")
	}
	if exists {
		return utils.Bad(c, "ID Aplikasi sudah digunakan")
	}

	sortOrder := int32(0)
	if req.Sort != nil {
		sortOrder = *req.Sort
	}
	status := req.Status
	if status == "" {
		status = "online"
	}
	app := &database.App{
		ID:                req.ID,
		Name:              req.Name,
		Description:       req.Desc,
		Icon:              req.Icon,
		URL:               req.URL,
		SchemaName:        req.Schema,
		SchemaURL:         req.SchemaURL,
		Status:            status,
		SortOrder:         sortOrder,
		AvailableFeatures: []any{},
	}
	if err := h.Store.CreateApp(c.Context(), app); err != nil {
		return utils.Internal(c, "Internal server error")
	}
	h.recordAudit(c, "INSERT", "app:"+req.Name, sessionEmail(auth.GetSession(c)), nil, map[string]any{
		"id": req.ID, "name": req.Name, "schemaName": req.Schema, "status": status,
	})
	created, err := h.Store.GetApp(c.Context(), req.ID)
	if err != nil {
		created = app
	}
	return utils.Created(c, created)
}

func (h *Handler) UpdateApp(c *fiber.Ctx) error {
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
	before, _ := h.Store.GetApp(c.Context(), id)
	if err := h.Store.UpdateApp(c.Context(), id, fields); err != nil {
		return utils.Internal(c, "Internal server error")
	}
	h.recordAudit(c, "UPDATE", "app:"+id, sessionEmail(auth.GetSession(c)), flattenAppBefore(before, fields), fields)
	return utils.OK(c, map[string]any{"message": "App updated successfully"})
}

func (h *Handler) DeleteApp(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return utils.Bad(c, "ID aplikasi tidak valid")
	}
	app, _ := h.Store.GetApp(c.Context(), id)
	if err := h.Store.DeleteApp(c.Context(), id); err != nil {
		return utils.Internal(c, "Gagal menghapus aplikasi")
	}
	name := id
	if app != nil {
		name = app.Name
	}
	h.recordAudit(c, "DELETE", "app:"+name, sessionEmail(auth.GetSession(c)), map[string]any{"id": id}, nil)
	return utils.OK(c, map[string]any{"message": "Aplikasi berhasil dihapus"})
}

// flattenAppBefore builds a thin "before" snapshot for the app update audit entry.
func flattenAppBefore(app *database.App, fields map[string]any) map[string]any {
	before := map[string]any{}
	if app == nil {
		return before
	}
	if _, ok := fields["name"]; ok {
		before["name"] = app.Name
	}
	if _, ok := fields["url"]; ok {
		before["url"] = app.URL
	}
	if _, ok := fields["schema_name"]; ok {
		before["schemaName"] = app.SchemaName
	}
	if _, ok := fields["schema_url"]; ok {
		before["schemaUrl"] = app.SchemaURL
	}
	if _, ok := fields["sort_order"]; ok {
		before["sortOrder"] = app.SortOrder
	}
	if _, ok := fields["description"]; ok {
		before["description"] = app.Description
	}
	if _, ok := fields["icon"]; ok {
		before["icon"] = app.Icon
	}
	return before
}

func (h *Handler) UpdateAppStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	session := auth.GetSession(c)

	var req struct {
		Status string `json:"status"`
	}
	if err := body(c, &req); err != nil {
		return err
	}
	if !validAppStatus(req.Status) {
		return utils.Bad(c, "Status tidak valid")
	}

	app, err := h.Store.GetApp(c.Context(), id)
	if err != nil {
		return utils.NotFound(c, "Aplikasi tidak ditemukan")
	}
	if err := h.Store.UpdateAppStatus(c.Context(), id, req.Status); err != nil {
		return utils.Internal(c, "Internal server error")
	}

	oldStatus := app.Status
	h.recordAudit(c, "UPDATE", "app:"+app.Name, sessionEmail(session), map[string]any{"status": oldStatus}, map[string]any{"status": req.Status})

	return utils.OK(c, map[string]any{"ok": true})
}

func (h *Handler) BulkUpdateAppStatus(c *fiber.Ctx) error {
	session := auth.GetSession(c)

	var req struct {
		Status string `json:"status"`
	}
	if err := body(c, &req); err != nil {
		return err
	}
	if !validAppStatus(req.Status) {
		return utils.Bad(c, "Status tidak valid")
	}

	if err := h.Store.UpdateAllAppsStatus(c.Context(), req.Status); err != nil {
		return utils.Internal(c, "Gagal mengubah status semua aplikasi")
	}

	h.recordAudit(c, "UPDATE", "app:all", sessionEmail(session), map[string]any{"status": "mixed"}, map[string]any{"status": req.Status})

	return utils.OK(c, map[string]any{"ok": true, "message": "Semua aplikasi berhasil diubah ke mode " + req.Status})
}

// PublicAppStatus is used by satellite apps to check status without auth.
func (h *Handler) PublicAppStatus(c *fiber.Ctx) error {
	c.Set("Access-Control-Allow-Origin", "*")
	c.Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	c.Set("Access-Control-Allow-Headers", "Content-Type")

	if c.Method() == fiber.MethodOptions {
		return c.SendStatus(fiber.StatusNoContent)
	}

	id := c.Params("id")
	status, err := h.Store.GetAppStatus(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{"status": "online", "_debug": "not_found", "requestedId": id})
	}
	return c.JSON(fiber.Map{"status": status})
}

func validAppStatus(s string) bool {
	return s == "online" || s == "maintenance" || s == "degraded"
}
