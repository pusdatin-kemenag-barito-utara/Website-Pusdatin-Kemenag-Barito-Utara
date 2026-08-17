package middleware

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

type RateLimiter struct {
	mu      sync.Mutex
	entries map[string]*rateEntry
}

var defaultRateLimiter = newRateLimiter()

func newRateLimiter() *RateLimiter {
	rl := &RateLimiter{
		entries: make(map[string]*rateEntry),
	}
	// Background cleanup to prevent memory leaks from inactive IP entries
	go rl.cleanupRoutine(5 * time.Minute)
	return rl
}

func (rl *RateLimiter) cleanupRoutine(interval time.Duration) {
	ticker := time.NewTicker(interval)
	for range ticker.C {
		rl.cleanup()
	}
}

func (rl *RateLimiter) cleanup() {
	now := time.Now()
	rl.mu.Lock()
	defer rl.mu.Unlock()
	for key, entry := range rl.entries {
		if now.After(entry.resetAt) {
			delete(rl.entries, key)
		}
	}
}

func (rl *RateLimiter) allow(key string, limit, windowMs int) bool {
	now := time.Now()
	rl.mu.Lock()
	defer rl.mu.Unlock()

	entry, ok := rl.entries[key]
	if !ok || now.After(entry.resetAt) {
		rl.entries[key] = &rateEntry{
			count:   1,
			resetAt: now.Add(time.Duration(windowMs) * time.Millisecond),
		}
		return true
	}
	if entry.count >= limit {
		return false
	}
	entry.count++
	return true
}

// RateLimit returns a Fiber middleware rate limiting requests by prefix and client IP.
func RateLimit(prefix string, limit, windowMs int) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ip := ClientIP(c)
		if !defaultRateLimiter.allow(prefix+":"+ip, limit, windowMs) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"message": "Terlalu banyak percobaan. Silakan coba lagi nanti.",
			})
		}
		return c.Next()
	}
}

// ClientIP extracts the real client IP using standard forward headers.
func ClientIP(c *fiber.Ctx) string {
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
