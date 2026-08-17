package handlers

import (
	"fmt"

	"github.com/gofiber/fiber/v2"

	"pusdatin/backend/internal/domain"
	"pusdatin/backend/internal/services"
	"pusdatin/backend/internal/utils"
)

type UserHandler struct {
	userService *services.UserService
}

func NewUserHandler(userService *services.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

// ListUsers GET /api/users
func (h *UserHandler) ListUsers(c *fiber.Ctx) error {
	userType := c.Query("type", "internal_admin")
	appID := c.Query("appId")
	search := c.Query("search")

	users, err := h.userService.ListUsers(c.Context(), userType, appID, search)
	if err != nil {
		fmt.Printf("[API ERROR ListUsers] type=%s, appId=%s: %v\n", userType, appID, err)
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, users)
}

// GetUser GET /api/users/:id
func (h *UserHandler) GetUser(c *fiber.Ctx) error {
	id := c.Params("id")
	user, err := h.userService.GetUser(c.Context(), id)
	if err != nil {
		if err == domain.ErrNotFound {
			return utils.NotFound(c, "User not found")
		}
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, user)
}

// CreateUser POST /api/users
func (h *UserHandler) CreateUser(c *fiber.Ctx) error {
	var req services.CreateUserInput
	if err := body(c, &req); err != nil {
		return err
	}
	if req.Name == "" || req.Email == "" {
		return utils.Bad(c, "Nama dan email wajib diisi")
	}

	actor := actorEmail(c)
	ip := clientIP(c)

	newUser, err := h.userService.CreateUser(c.Context(), actor, ip, req)
	if err != nil {
		if err == domain.ErrInvalidInput {
			return utils.Bad(c, "Data user tidak valid")
		}
		return utils.Internal(c, err.Error())
	}
	return utils.Created(c, newUser)
}

// UpdateUser PUT /api/users/:id
func (h *UserHandler) UpdateUser(c *fiber.Ctx) error {
	id := c.Params("id")
	var req services.UpdateUserInput
	if err := body(c, &req); err != nil {
		return err
	}

	actor := actorEmail(c)
	ip := clientIP(c)

	updatedUser, err := h.userService.UpdateUser(c.Context(), actor, ip, id, req)
	if err != nil {
		if err == domain.ErrNotFound {
			return utils.NotFound(c, "User not found")
		}
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, updatedUser)
}

// DeleteUser DELETE /api/users/:id
func (h *UserHandler) DeleteUser(c *fiber.Ctx) error {
	id := c.Params("id")
	actor := actorEmail(c)
	ip := clientIP(c)

	err := h.userService.DeleteUser(c.Context(), actor, ip, id)
	if err != nil {
		if err == domain.ErrHasDependencies {
			return utils.Bad(c, "Gagal menghapus pengguna karena akun ini sudah memiliki riwayat aktivitas/permohonan. Silakan ubah status pengguna menjadi Nonaktif.")
		}
		return utils.Internal(c, "Internal server error")
	}
	return utils.OK(c, map[string]any{"ok": true})
}
