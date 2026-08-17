package handlers

import (
	"github.com/gofiber/fiber/v2"

	"pusdatin/backend/internal/domain"
	"pusdatin/backend/internal/services"
	"pusdatin/backend/internal/utils"
)

type PejabatHandler struct {
	pejabatService *services.PejabatService
}

func NewPejabatHandler(pejabatService *services.PejabatService) *PejabatHandler {
	return &PejabatHandler{pejabatService: pejabatService}
}

// ListPejabat GET /api/pejabat
func (h *PejabatHandler) ListPejabat(c *fiber.Ctx) error {
	records, err := h.pejabatService.ListPejabat(c.Context())
	if err != nil {
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, records)
}

// SetPejabat POST /api/pejabat
func (h *PejabatHandler) SetPejabat(c *fiber.Ctx) error {
	var req struct {
		ID          string  `json:"id"`
		TipePejabat string  `json:"tipePejabat"`
		OrderIndex  *int    `json:"orderIndex"`
		UnitKerja   *string `json:"unitKerja"`
	}
	if err := body(c, &req); err != nil {
		return err
	}
	if req.ID == "" || req.TipePejabat == "" {
		return utils.Bad(c, "Pegawai ID dan Tipe Pejabat wajib diisi")
	}

	orderIndex := 0
	if req.OrderIndex != nil {
		orderIndex = *req.OrderIndex
	}

	actor := actorEmail(c)
	ip := clientIP(c)

	pejabat, err := h.pejabatService.SetPejabat(c.Context(), actor, ip, req.ID, req.TipePejabat, orderIndex, req.UnitKerja)
	if err != nil {
		if err == domain.ErrNotFound {
			return utils.NotFound(c, "Pegawai tidak ditemukan")
		}
		return utils.Internal(c, "Internal server error")
	}
	return utils.Created(c, pejabat)
}

// UpdatePejabat PUT /api/pejabat/:id
func (h *PejabatHandler) UpdatePejabat(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		TipePejabat *string `json:"tipePejabat"`
		UnitKerja   *string `json:"unitKerja"`
		Nama        *string `json:"nama"`
		NIP         *string `json:"nip"`
		Jabatan     *string `json:"jabatan"`
		OrderIndex  *int    `json:"orderIndex"`
	}
	if err := body(c, &req); err != nil {
		return err
	}

	fields := map[string]any{}
	if req.TipePejabat != nil {
		fields["tipe_pejabat"] = *req.TipePejabat
	}
	if req.OrderIndex != nil {
		fields["order_index"] = *req.OrderIndex
	}
	if req.UnitKerja != nil {
		fields["unit_kerja"] = *req.UnitKerja
	}
	if req.NIP != nil {
		fields["nip"] = *req.NIP
	}
	if req.Jabatan != nil {
		fields["jabatan"] = *req.Jabatan
	}

	actor := actorEmail(c)
	ip := clientIP(c)

	pejabat, err := h.pejabatService.UpdatePejabat(c.Context(), actor, ip, id, fields, req.Nama)
	if err != nil {
		return utils.Internal(c, "Internal server error")
	}
	if pejabat == nil {
		return utils.NotFound(c, "Pejabat tidak ditemukan")
	}
	return utils.OK(c, pejabat)
}

// DeletePejabat DELETE /api/pejabat/:id
func (h *PejabatHandler) DeletePejabat(c *fiber.Ctx) error {
	id := c.Params("id")
	actor := actorEmail(c)
	ip := clientIP(c)

	err := h.pejabatService.DeletePejabat(c.Context(), actor, ip, id)
	if err != nil {
		if err == domain.ErrNotFound {
			return utils.NotFound(c, "Pejabat tidak ditemukan")
		}
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, map[string]any{"ok": true})
}
