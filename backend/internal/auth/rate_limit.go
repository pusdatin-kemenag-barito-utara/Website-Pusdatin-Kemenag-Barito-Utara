package auth

import (
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
)

type rateEntry struct {
	count   int
	resetAt time.Time
}

var (
	rateMu    sync.Mutex
	rateStore = map[string]*rateEntry{}
)

// rateLimit mirrors lib/rate-limit.ts (in-memory sliding window).
func rateLimit(key string, limit, windowMs int) bool {
	now := time.Now()
	rateMu.Lock()
	defer rateMu.Unlock()
	entry, ok := rateStore[key]
	if !ok || now.After(entry.resetAt) {
		rateStore[key] = &rateEntry{count: 1, resetAt: now.Add(time.Duration(windowMs) * time.Millisecond)}
		return true
	}
	if entry.count >= limit {
		return false
	}
	entry.count++
	return true
}

// RateLimit is a Fiber middleware keyed by the given prefix.
func RateLimit(prefix string, limit, windowMs int) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ip := getClientIP(c)
		if !rateLimit(prefix+":"+ip, limit, windowMs) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"message": "Terlalu banyak percobaan. Silakan coba lagi nanti.",
			})
		}
		return c.Next()
	}
}

// getClientIP mirrors lib/rate-limit.ts getClientIp.
func getClientIP(c *fiber.Ctx) string {
	if xff := c.Get("X-Forwarded-For"); xff != "" {
		for _, part := range strings.Split(xff, ",") {
			if part = strings.TrimSpace(part); part != "" {
				return part
			}
		}
	}
	if xr := c.Get("X-Real-IP"); xr != "" {
		return xr
	}
	return c.IP()
}
