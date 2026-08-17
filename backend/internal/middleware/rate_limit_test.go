package middleware

import (
	"testing"
	"time"
)

func TestRateLimiterAllowAndBlock(t *testing.T) {
	rl := &RateLimiter{
		entries: make(map[string]*rateEntry),
	}

	key := "test:127.0.0.1"
	limit := 3
	windowMs := 1000

	for i := 0; i < limit; i++ {
		if !rl.allow(key, limit, windowMs) {
			t.Fatalf("expected request %d to be allowed", i+1)
		}
	}

	// 4th request should be blocked
	if rl.allow(key, limit, windowMs) {
		t.Fatalf("expected 4th request to be blocked")
	}
}

func TestRateLimiterCleanup(t *testing.T) {
	rl := &RateLimiter{
		entries: make(map[string]*rateEntry),
	}

	keyExpired := "expired:127.0.0.1"
	keyActive := "active:127.0.0.1"

	rl.entries[keyExpired] = &rateEntry{
		count:   1,
		resetAt: time.Now().Add(-10 * time.Minute), // expired
	}
	rl.entries[keyActive] = &rateEntry{
		count:   1,
		resetAt: time.Now().Add(10 * time.Minute), // active
	}

	rl.cleanup()

	if _, exists := rl.entries[keyExpired]; exists {
		t.Errorf("expected expired entry to be deleted")
	}
	if _, exists := rl.entries[keyActive]; !exists {
		t.Errorf("expected active entry to remain")
	}
}
