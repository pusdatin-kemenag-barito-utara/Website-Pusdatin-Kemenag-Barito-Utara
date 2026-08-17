package handlers

import (
	"github.com/gofiber/fiber/v2"

	"pusdatin/backend/internal/domain"
	"pusdatin/backend/internal/services"
	"pusdatin/backend/internal/utils"
)

type AnnouncementHandler struct {
	service *services.AnnouncementService
}

func NewAnnouncementHandler(service *services.AnnouncementService) *AnnouncementHandler {
	return &AnnouncementHandler{service: service}
}

// ListPublic GET /api/announcements/public
func (h *AnnouncementHandler) ListPublic(c *fiber.Ctx) error {
	list, err := h.service.ListPublicAnnouncements(c.Context())
	if err != nil {
		return utils.Internal(c, "Gagal memuat daftar pengumuman publik")
	}
	return utils.OK(c, list)
}

// ListAnnouncements GET /api/announcements
func (h *AnnouncementHandler) ListAnnouncements(c *fiber.Ctx) error {
	search := c.Query("search")
	list, err := h.service.ListAnnouncements(c.Context(), search)
	if err != nil {
		return utils.Internal(c, "Gagal memuat daftar pengumuman")
	}
	return utils.OK(c, list)
}

// GetAnnouncement GET /api/announcements/:id
func (h *AnnouncementHandler) GetAnnouncement(c *fiber.Ctx) error {
	id := c.Params("id")
	item, err := h.service.GetAnnouncement(c.Context(), id)
	if err != nil {
		if err == domain.ErrNotFound {
			return utils.NotFound(c, "Pengumuman tidak ditemukan")
		}
		return utils.Internal(c, "Gagal memuat data pengumuman")
	}
	return utils.OK(c, item)
}

// CreateAnnouncement POST /api/announcements
func (h *AnnouncementHandler) CreateAnnouncement(c *fiber.Ctx) error {
	var req services.CreateAnnouncementInput
	if err := body(c, &req); err != nil {
		return err
	}
	if req.Title == "" || req.Description == "" {
		return utils.Bad(c, "Judul dan deskripsi pengumuman wajib diisi")
	}

	actor := actorEmail(c)
	ip := clientIP(c)

	created, err := h.service.CreateAnnouncement(c.Context(), actor, ip, req)
	if err != nil {
		if err == domain.ErrInvalidInput {
			return utils.Bad(c, "Data pengumuman tidak valid")
		}
		return utils.Internal(c, "Gagal membuat pengumuman")
	}
	return utils.Created(c, created)
}

// UpdateAnnouncement PUT /api/announcements/:id
func (h *AnnouncementHandler) UpdateAnnouncement(c *fiber.Ctx) error {
	id := c.Params("id")
	var req services.UpdateAnnouncementInput
	if err := body(c, &req); err != nil {
		return err
	}

	actor := actorEmail(c)
	ip := clientIP(c)

	updated, err := h.service.UpdateAnnouncement(c.Context(), actor, ip, id, req)
	if err != nil {
		if err == domain.ErrNotFound {
			return utils.NotFound(c, "Pengumuman tidak ditemukan")
		}
		return utils.Internal(c, "Gagal memperbarui pengumuman")
	}
	return utils.OK(c, updated)
}

// DeleteAnnouncement DELETE /api/announcements/:id
func (h *AnnouncementHandler) DeleteAnnouncement(c *fiber.Ctx) error {
	id := c.Params("id")
	actor := actorEmail(c)
	ip := clientIP(c)

	if err := h.service.DeleteAnnouncement(c.Context(), actor, ip, id); err != nil {
		if err == domain.ErrNotFound {
			return utils.NotFound(c, "Pengumuman tidak ditemukan")
		}
		return utils.Internal(c, "Gagal menghapus pengumuman")
	}
	return utils.OK(c, map[string]any{"ok": true})
}
