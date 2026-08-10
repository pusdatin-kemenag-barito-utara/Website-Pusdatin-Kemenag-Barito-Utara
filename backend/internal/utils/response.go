package utils

import (
	"github.com/gofiber/fiber/v2"
)

// Response envelope matching the previous Next.js apiResponse helper.
// Errors always return {"message": "..."} so the FE api-client keeps working.

func JSON(c *fiber.Ctx, status int, data any) error {
	return c.Status(status).JSON(data)
}

func OK(c *fiber.Ctx, data any) error {
	return JSON(c, fiber.StatusOK, data)
}

func Created(c *fiber.Ctx, data any) error {
	return JSON(c, fiber.StatusCreated, data)
}

func Err(c *fiber.Ctx, status int, message string) error {
	return JSON(c, status, fiber.Map{"message": message})
}

// BadRequest short-hand.
func Bad(c *fiber.Ctx, message string) error {
	return Err(c, fiber.StatusBadRequest, message)
}

func Unauthorized(c *fiber.Ctx, message string) error {
	return Err(c, fiber.StatusUnauthorized, message)
}

func Forbidden(c *fiber.Ctx, message string) error {
	return Err(c, fiber.StatusForbidden, message)
}

func NotFound(c *fiber.Ctx, message string) error {
	return Err(c, fiber.StatusNotFound, message)
}

func Internal(c *fiber.Ctx, message string) error {
	return Err(c, fiber.StatusInternalServerError, message)
}
