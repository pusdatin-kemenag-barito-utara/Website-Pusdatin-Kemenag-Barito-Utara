package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"

	"pusdatin/backend/internal/domain"
)

// Shared HTTP client with connection pooling for ultra-low latency verification
var turnstileHTTPClient = &http.Client{
	Timeout: 4 * time.Second,
	Transport: &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   2 * time.Second,
			KeepAlive: 90 * time.Second,
		}).DialContext,
		MaxIdleConns:        100,
		MaxIdleConnsPerHost: 20,
		IdleConnTimeout:     90 * time.Second,
		TLSHandshakeTimeout: 2 * time.Second,
	},
}

type Turnstile struct{}

func NewTurnstileVerifier() *Turnstile {
	return &Turnstile{}
}

func (t *Turnstile) Verify(ctx context.Context, secret, token, remoteIP string, isProduction bool) bool {
	return VerifyTurnstile(ctx, secret, token, remoteIP, isProduction)
}

// VerifyTurnstile validates a Cloudflare Turnstile token (server-side).
func VerifyTurnstile(ctx context.Context, secret, token, remoteIP string, isProduction bool) bool {
	if token == "" {
		return false
	}

	// In development, allow instant verification for dummy/testing tokens or local host
	if !isProduction && (strings.HasPrefix(token, "XXXX.") || token == "10000000-aaaa-bbbb-cccc-000000000001" || token == "20000000-aaaa-bbbb-cccc-000000000002") {
		fmt.Printf("[TURNSTILE VERIFY DEV] Fast-path approved in development\n")
		return true
	}

	bodyMap := map[string]string{
		"secret":   secret,
		"response": token,
	}
	if remoteIP != "" && remoteIP != "127.0.0.1" && remoteIP != "::1" {
		bodyMap["remoteip"] = remoteIP
	}
	payload, _ := json.Marshal(bodyMap)

	req, err := http.NewRequestWithContext(ctx, "POST", "https://challenges.cloudflare.com/turnstile/v0/siteverify", bytes.NewReader(payload))
	if err != nil {
		return !isProduction
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := turnstileHTTPClient.Do(req)
	if err != nil {
		fmt.Printf("[TURNSTILE VERIFY ERROR] http post error: %v\n", err)
		return !isProduction
	}
	defer resp.Body.Close()

	var out struct {
		Success    bool     `json:"success"`
		ErrorCodes []string `json:"error-codes"`
		Hostname   string   `json:"hostname"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		fmt.Printf("[TURNSTILE VERIFY ERROR] decode json error: %v\n", err)
		return !isProduction
	}

	fmt.Printf("[TURNSTILE VERIFY] success=%v, hostname=%s, error-codes=%v\n", out.Success, out.Hostname, out.ErrorCodes)

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
