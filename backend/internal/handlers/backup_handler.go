package handlers

import (
	"fmt"

	"github.com/gofiber/fiber/v3"

	"pusdatin/backend/internal/services"
	"pusdatin/backend/internal/utils"
)

type BackupHandler struct {
	backupService *services.BackupService
}

func NewBackupHandler(backupService *services.BackupService) *BackupHandler {
	return &BackupHandler{backupService: backupService}
}

// TriggerBackup POST /api/backup/trigger (admin)
func (h *BackupHandler) TriggerBackup(c fiber.Ctx) error {
	manifest, err := h.backupService.RunBackup(c.Context(), "manual_admin")
	if err != nil {
		return utils.Internal(c, fmt.Sprintf("Gagal menjalankan backup: %v", err))
	}
	return utils.OK(c, fiber.Map{
		"message":  "Pencadangan database berhasil diselesaikan dan diunggah ke Cloudflare R2",
		"manifest": manifest,
	})
}

// GetStatus GET /api/backup/status (admin)
func (h *BackupHandler) GetStatus(c fiber.Ctx) error {
	status, err := h.backupService.GetStatus(c.Context())
	if err != nil {
		return utils.Internal(c, "Gagal mengambil status backup")
	}
	return utils.OK(c, status)
}

// ListHistory GET /api/backup/history (admin)
func (h *BackupHandler) ListHistory(c fiber.Ctx) error {
	snapshots, err := h.backupService.ListSnapshots(c.Context())
	if err != nil {
		return utils.Internal(c, "Gagal mengambil riwayat snapshot dari Cloudflare R2")
	}
	return utils.OK(c, fiber.Map{
		"success":   true,
		"snapshots": snapshots,
	})
}

// DownloadFile GET /api/backup/download?key=... (admin)
func (h *BackupHandler) DownloadFile(c fiber.Ctx) error {
	key := c.Query("key")
	if key == "" {
		return utils.Bad(c, "Parameter key wajib disertakan")
	}

	data, fileName, contentType, err := h.backupService.DownloadFile(c.Context(), key)
	if err != nil {
		return utils.NotFound(c, "Berkas backup tidak ditemukan di Cloudflare R2")
	}

	c.Set("Content-Type", contentType)
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, fileName))
	c.Set("Content-Length", fmt.Sprintf("%d", len(data)))

	return c.Send(data)
}

// DeleteSnapshot DELETE /api/backup/snapshots?folder=... (admin)
func (h *BackupHandler) DeleteSnapshot(c fiber.Ctx) error {
	folder := c.Query("folder")
	if folder == "" {
		return utils.Bad(c, "Parameter folder wajib disertakan")
	}

	if err := h.backupService.DeleteSnapshot(c.Context(), folder); err != nil {
		return utils.Internal(c, fmt.Sprintf("Gagal menghapus snapshot: %v", err))
	}

	return utils.OK(c, fiber.Map{
		"message": fmt.Sprintf("Snapshot %s berhasil dihapus permanen dari Cloudflare R2", folder),
	})
}

// PruneSnapshots POST /api/backup/prune?days=3 (admin)
func (h *BackupHandler) PruneSnapshots(c fiber.Ctx) error {
	deleted, err := h.backupService.PruneOldBackups(c.Context(), 3)
	if err != nil {
		return utils.Internal(c, "Gagal membersihkan snapshot lama")
	}

	return utils.OK(c, fiber.Map{
		"message": fmt.Sprintf("%d snapshot lama (> 3 hari) berhasil dibersihkan dari Cloudflare R2", deleted),
		"deleted": deleted,
	})
}
