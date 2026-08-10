package auth

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"strings"
	"time"

	"github.com/google/uuid"

	"pusdatin/backend/internal/database"
)

type TrustedDeviceService struct {
	Store *database.Store
	Secret []byte
}

func NewTrustedDeviceService(store *database.Store, secret string) *TrustedDeviceService {
	return &TrustedDeviceService{Store: store, Secret: []byte(secret)}
}

func (s *TrustedDeviceService) hashToken(raw string) string {
	mac := hmac.New(sha256.New, s.Secret)
	mac.Write([]byte(raw))
	return hex.EncodeToString(mac.Sum(nil))
}

// parseUserAgent mirrors lib/trusted-device.ts parseUserAgent.
func parseUserAgent(ua string) string {
	if ua == "" {
		return "Unknown Device"
	}
	os := "Unknown OS"
	switch {
	case strings.Contains(ua, "Windows"):
		os = "Windows"
	case strings.Contains(ua, "Mac OS"):
		os = "macOS"
	case strings.Contains(ua, "Linux"):
		os = "Linux"
	case strings.Contains(ua, "Android"):
		os = "Android"
	case strings.Contains(ua, "iPhone"), strings.Contains(ua, "iPad"):
		os = "iOS"
	}
	browser := "Browser"
	switch {
	case strings.Contains(ua, "Edg/"):
		browser = "Edge"
	case strings.Contains(ua, "Chrome/"):
		browser = "Chrome"
	case strings.Contains(ua, "Firefox/"):
		browser = "Firefox"
	case strings.Contains(ua, "Safari/") && !strings.Contains(ua, "Chrome/"):
		browser = "Safari"
	}
	return browser + " on " + os
}

// Create returns the cookie value `{id}.{rawToken}` and persists the hash.
func (s *TrustedDeviceService) Create(ctx context.Context, userID, userAgent, ipAddress string) (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	rawToken := hex.EncodeToString(raw)
	id := uuid.NewString()
	deviceName := parseUserAgent(userAgent)

	var ipPtr any
	if ipAddress != "" {
		ipPtr = ipAddress
	}
	if err := s.Store.CreateTrustedDeviceWithIP(ctx, id, userID, deviceName, s.hashToken(rawToken), time.Now().AddDate(0, 0, 30), ipPtr); err != nil {
		return "", err
	}
	return id + "." + rawToken, nil
}

// Verify checks the cookie token against the DB and refreshes last_used_at.
func (s *TrustedDeviceService) Verify(ctx context.Context, userID, cookieValue string) bool {
	if cookieValue == "" || userID == "" {
		return false
	}
	parts := strings.Split(cookieValue, ".")
	if len(parts) != 2 {
		return false
	}
	id, rawToken := parts[0], parts[1]
	if id == "" || rawToken == "" {
		return false
	}
	dev, err := s.Store.GetValidTrustedDevice(ctx, id, userID)
	if err != nil {
		return false
	}
	if !hmac.Equal([]byte(dev.TokenHash), []byte(s.hashToken(rawToken))) {
		return false
	}
	_ = s.Store.TouchTrustedDevice(ctx, id)
	return true
}

func (s *TrustedDeviceService) Revoke(ctx context.Context, deviceID, userID string) error {
	return s.Store.RevokeTrustedDevice(ctx, deviceID, userID)
}

func (s *TrustedDeviceService) RevokeAll(ctx context.Context, userID string) error {
	return s.Store.RevokeAllTrustedDevices(ctx, userID)
}
