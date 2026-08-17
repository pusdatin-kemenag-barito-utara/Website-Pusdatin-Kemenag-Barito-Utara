package handlers

import (
	"fmt"
	"io"

	"github.com/gofiber/fiber/v2"

	"pusdatin/backend/internal/services"
	"pusdatin/backend/internal/utils"
)

type StorageHandler struct {
	storageService *services.StorageService
}

func NewStorageHandler(storageService *services.StorageService) *StorageHandler {
	return &StorageHandler{storageService: storageService}
}

// UploadFile handles POST /api/upload (admin)
func (h *StorageHandler) UploadFile(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "No file uploaded"})
	}

	src, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Internal server error"})
	}
	defer src.Close()

	data, err := io.ReadAll(src)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Internal server error"})
	}

	contentType := file.Header.Get("Content-Type")
	url, err := h.storageService.UploadAppLogo(c.Context(), file.Filename, contentType, data)
	if err != nil {
		fmt.Printf("[UPLOAD ERROR] UploadAppLogo failed: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Internal server error"})
	}

	return c.JSON(fiber.Map{
		"url":     url,
		"message": "File uploaded successfully",
	})
}

// UploadsProxy streams an object from R2 at GET /uploads/apps/:file with local disk fallback.
func (h *StorageHandler) UploadsProxy(c *fiber.Ctx) error {
	filename := c.Params("file")
	if filename == "" {
		filename = c.Params("*")
	}

	result, err := h.storageService.ResolveUploadObject(c.Context(), filename)
	if err != nil {
		return c.SendStatus(fiber.StatusNotFound)
	}

	if result.IsLocal {
		return c.SendFile(result.LocalPath)
	}

	defer result.Body.Close()

	if result.ContentLength != nil {
		c.Set("Content-Length", fmt.Sprintf("%d", *result.ContentLength))
	}
	c.Set("Content-Type", result.ContentType)
	c.Set("Cache-Control", "public, max-age=31536000, immutable")

	if _, err := io.Copy(c, result.Body); err != nil {
		return c.SendStatus(fiber.StatusInternalServerError)
	}
	return nil
}

// R2Buckets mirrors /api/r2/buckets (Cloudflare REST API).
func (h *StorageHandler) R2Buckets(c *fiber.Ctx) error {
	buckets, err := h.storageService.GetR2Buckets(c.Context())
	if err != nil {
		return utils.Internal(c, "Failed to fetch R2 data")
	}
	return c.JSON(fiber.Map{"success": true, "buckets": buckets})
}
