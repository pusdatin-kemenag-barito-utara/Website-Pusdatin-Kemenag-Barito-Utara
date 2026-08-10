package auth

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
)

// TestSessionCookieRoundTrip verifies that cookies written by
// WriteSessionCookies are reconstructed by ExtractAccessToken, matching the
// @supabase/ssr chunked cookie format.
func TestSessionCookieRoundTrip(t *testing.T) {
	token := "eyJhbGciOiJIUzI1NiJ9.payload.with.dots.signature"
	sessionJSON, _ := json.Marshal(map[string]any{
		"access_token":  token,
		"refresh_token": "refreshtok",
	})

	app := fiber.New()
	app.Post("/set", func(c *fiber.Ctx) error {
		return WriteSessionCookies(c, sessionJSON, false)
	})
	app.Get("/read", func(c *fiber.Ctx) error {
		return c.SendString(ExtractAccessToken(c))
	})

	setReq, _ := http.NewRequest(http.MethodPost, "/set", nil)
	resp, err := app.Test(setReq, -1)
	if err != nil {
		t.Fatalf("set: %v", err)
	}
	cookieHeader := ""
	for _, c := range resp.Cookies() {
		if cookieHeader != "" {
			cookieHeader += "; "
		}
		cookieHeader += fmt.Sprintf("%s=%s", c.Name, c.Value)
	}
	if cookieHeader == "" {
		t.Fatal("no cookies written")
	}

	readReq, _ := http.NewRequest(http.MethodGet, "/read", nil)
	readReq.Header.Set("Cookie", cookieHeader)
	resp2, err := app.Test(readReq, -1)
	if err != nil {
		t.Fatalf("read: %v", err)
	}
	got, _ := io.ReadAll(resp2.Body)
	if string(got) != token {
		t.Fatalf("token mismatch: got %q want %q", string(got), token)
	}
}

// TestClearSessionCookies verifies logout clears all chunked cookies.
func TestClearSessionCookies(t *testing.T) {
	app := fiber.New()
	app.Post("/clear", func(c *fiber.Ctx) error {
		ClearSessionCookies(c)
		return nil
	})
	req, _ := http.NewRequest(http.MethodPost, "/clear", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("clear: %v", err)
	}
	count := 0
	for _, c := range resp.Cookies() {
		if c.MaxAge == -1 || !c.Expires.IsZero() && c.Expires.Before(time.Now()) {
			count++
		}
	}
	if count == 0 {
		t.Fatal("expected cleared cookies")
	}
}
