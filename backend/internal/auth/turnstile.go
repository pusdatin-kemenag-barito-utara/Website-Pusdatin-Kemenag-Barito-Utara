package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"pusdatin/backend/internal/domain"
)

type Turnstile struct{}

func NewTurnstileVerifier() *Turnstile {
	return &Turnstile{}
}

func (t *Turnstile) Verify(ctx context.Context, secret, token string, isProduction bool) bool {
	return VerifyTurnstile(ctx, secret, token, isProduction)
}

// VerifyTurnstile validates a Cloudflare Turnstile token (server-side).
func VerifyTurnstile(ctx context.Context, secret, token string, isProduction bool) bool {
	if token == "" {
		return false
	}
	payload, _ := json.Marshal(map[string]string{
		"secret":   secret,
		"response": token,
	})
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Post("https://challenges.cloudflare.com/turnstile/v0/siteverify",
		"application/json", bytes.NewReader(payload))
	if err != nil {
		fmt.Printf("[TURNSTILE VERIFY ERROR] http post error: %v\n", err)
		return !isProduction
	}
	defer resp.Body.Close()

	var out struct {
		Success    bool     `json:"success"`
		ErrorCodes []string `json:"error-codes"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		fmt.Printf("[TURNSTILE VERIFY ERROR] decode json error: %v\n", err)
		return !isProduction
	}

	fmt.Printf("[TURNSTILE VERIFY] success=%v, error-codes=%v\n", out.Success, out.ErrorCodes)

	if out.Success {
		return true
	}

	// In development (localhost), if user submitted a valid non-empty Turnstile token from client widget,
	// do not block local dev logins due to Cloudflare hostname mismatch.
	if !isProduction {
		fmt.Printf("[TURNSTILE VERIFY DEV] Bypassing hostname mismatch in dev for non-empty token\n")
		return true
	}

	return false
}

var _ domain.TurnstileVerifier = (*Turnstile)(nil)
