package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"pusdatin/backend/internal/auth"
	"pusdatin/backend/internal/utils"
)

func (h *Handler) ListPejabat(c *fiber.Ctx) error {
	records, err := h.Store.ListPejabat(c.Context())
	if err != nil {
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, records)
}

func (h *Handler) SetPejabat(c *fiber.Ctx) error {
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
	_, err := h.Store.SetPejabat(c.Context(), req.ID, req.TipePejabat, orderIndex, req.UnitKerja)
	if errors.Is(err, pgx.ErrNoRows) {
		return utils.NotFound(c, "Pegawai tidak ditemukan")
	}
	if err != nil {
		return utils.Internal(c, "Internal server error")
	}

	records, err := h.Store.ListPejabat(c.Context())
	if err == nil {
		for _, p := range records {
			if p.ID == req.ID {
				h.recordAudit(c, "INSERT", "pejabat:"+p.Nama, sessionEmail(auth.GetSession(c)), nil, map[string]any{
					"id": req.ID, "tipePejabat": req.TipePejabat, "orderIndex": orderIndex,
				})
				return utils.Created(c, p)
			}
		}
	}
	return utils.Created(c, fiber.Map{
		"id": req.ID, "tipePejabat": req.TipePejabat, "orderIndex": orderIndex,
		"unitKerja": req.UnitKerja,
	})
}

func (h *Handler) UpdatePejabat(c *fiber.Ctx) error {
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

	// Fix old bug: nama/nip/jabatan in the PUT body were silently ignored.
	if req.Nama != nil && *req.Nama != "" {
		if err := h.Store.UpdatePejabatName(c.Context(), id, *req.Nama); err != nil {
			return utils.Internal(c, "Internal server error")
		}
	}

	ok, err := h.Store.UpdatePejabat(c.Context(), id, fields)
	if err != nil {
		return utils.Internal(c, "Internal server error")
	}
	if !ok {
		return utils.NotFound(c, "Pejabat tidak ditemukan")
	}

	updated, _ := h.Store.ListPejabat(c.Context())
	for _, p := range updated {
		if p.ID == id {
			h.recordAudit(c, "UPDATE", "pejabat:"+p.Nama, sessionEmail(auth.GetSession(c)), nil, map[string]any{
				"id": id, "tipePejabat": p.TipePejabat, "orderIndex": p.OrderIndex, "unitKerja": p.UnitKerja,
			})
			return utils.OK(c, p)
		}
	}
	return utils.OK(c, fiber.Map{"ok": true})
}

func (h *Handler) DeletePejabat(c *fiber.Ctx) error {
	id := c.Params("id")
	ok, err := h.Store.DeletePejabat(c.Context(), id)
	if err != nil {
		return utils.Internal(c, "Internal server error")
	}
	if !ok {
		return utils.NotFound(c, "Pejabat tidak ditemukan")
	}
	h.recordAudit(c, "DELETE", "pejabat:"+id, sessionEmail(auth.GetSession(c)), map[string]any{"id": id}, nil)
	return utils.OK(c, map[string]any{"ok": true})
}
