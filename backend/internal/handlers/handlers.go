package handlers

import (
	"time"

	"github.com/gofiber/fiber/v2"

	"pusdatin/backend/internal/domain"
	"pusdatin/backend/internal/middleware"
	"pusdatin/backend/internal/utils"
)

// body decodes a JSON request body into v (empty body allowed).
func body(c *fiber.Ctx, v any) error {
	if len(c.Body()) == 0 {
		return nil
	}
	if err := c.BodyParser(v); err != nil {
		return utils.Bad(c, "Format body tidak valid")
	}
	return nil
}

// clientIP extracts the client IP address.
func clientIP(c *fiber.Ctx) string {
	return middleware.ClientIP(c)
}

// actorEmail extracts the email of the authenticated user from the request session.
func actorEmail(c *fiber.Ctx) string {
	s := middleware.GetSession(c)
	if s != nil && s.User != nil && s.User.Email != "" {
		return s.User.Email
	}
	return "unknown"
}

// nowISO returns the current time in JS Date.prototype.toISOString() format.
func nowISO() string {
	return time.Now().UTC().Format("2006-01-02T15:04:05.000Z")
}

// handleError maps domain errors to proper HTTP response codes.
func handleError(c *fiber.Ctx, err error) error {
	if err == nil {
		return nil
	}
	switch err {
	case domain.ErrNotFound:
		return utils.NotFound(c, "Data tidak ditemukan")
	case domain.ErrAlreadyExists:
		return utils.Bad(c, "Data sudah ada")
	case domain.ErrInvalidInput:
		return utils.Bad(c, "Data yang dikirim tidak valid")
	case domain.ErrUnauthorized:
		return utils.Unauthorized(c, "Unauthorized")
	case domain.ErrForbidden:
		return utils.Forbidden(c, "Akses ditolak")
	case domain.ErrInvalidCredentials:
		return utils.Unauthorized(c, "Email atau password salah")
	case domain.ErrSecurityCheckFail:
		return utils.Bad(c, "Verifikasi keamanan gagal. Silakan coba lagi.")
	case domain.ErrHasDependencies:
		return utils.Bad(c, "Gagal menghapus data karena masih memiliki relasi aktif.")
	default:
		return utils.Internal(c, "Internal server error")
	}
}
