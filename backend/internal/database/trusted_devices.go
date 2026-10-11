package database

import (
	"context"
	"fmt"
	"net/url"
	"time"

	"pusdatin/backend/internal/domain"
)

type pbTrustedDevice struct {
	ID         string `json:"id"`
	UserID     string `json:"user_id"`
	DeviceName string `json:"device_name"`
	TokenHash  string `json:"token_hash"`
	LastUsedAt string `json:"last_used_at"`
	ExpiresAt  string `json:"expires_at"`
	CreatedAt  string `json:"created_at"`
	Created    string `json:"created"`
	IPAddress  string `json:"ip_address"`
}

func (p *pbTrustedDevice) toDomain() *domain.TrustedDevice {
	d := &domain.TrustedDevice{
		ID:        p.ID,
		UserID:    p.UserID,
		TokenHash: p.TokenHash,
	}
	if p.DeviceName != "" {
		d.DeviceName = &p.DeviceName
	}
	if p.IPAddress != "" {
		d.IPAddress = &p.IPAddress
	}
	if p.LastUsedAt != "" {
		d.LastUsedAt = &p.LastUsedAt
	}
	if p.ExpiresAt != "" {
		d.ExpiresAt = &p.ExpiresAt
	}
	cAt := p.CreatedAt
	if cAt == "" {
		cAt = p.Created
	}
	d.CreatedAt = cAt
	return d
}

func (s *Store) CreateTrustedDeviceWithIP(ctx context.Context, id, userID, deviceName, tokenHash string, expiresAt time.Time, ipAddress any) error {
	now := time.Now().UTC().Format("2006-01-02 15:04:05.000Z")
	payload := map[string]any{
		"id":           id,
		"user_id":      userID,
		"device_name":  deviceName,
		"token_hash":   tokenHash,
		"expires_at":   expiresAt.UTC().Format("2006-01-02 15:04:05.000Z"),
		"last_used_at": now,
		"created_at":   now,
	}
	if ipAddress != nil {
		payload["ip_address"] = fmt.Sprintf("%v", ipAddress)
	}
	return s.CreateRecord(ctx, "trusted_devices", payload, nil)
}

func (s *Store) GetValidTrustedDevice(ctx context.Context, id, userID string) (*domain.TrustedDevice, error) {
	var td pbTrustedDevice
	if err := s.GetRecord(ctx, "trusted_devices", id, &td); err != nil {
		return nil, domain.ErrNotFound
	}
	if td.UserID != userID {
		return nil, domain.ErrNotFound
	}

	if td.ExpiresAt != "" {
		if exp, err := time.Parse(time.RFC3339, td.ExpiresAt); err == nil && time.Now().After(exp) {
			return nil, domain.ErrNotFound
		}
	}
	return td.toDomain(), nil
}

func (s *Store) TouchTrustedDevice(ctx context.Context, id string) error {
	now := time.Now().UTC().Format("2006-01-02 15:04:05.000Z")
	return s.UpdateRecord(ctx, "trusted_devices", id, map[string]any{
		"last_used_at": now,
	}, nil)
}

func (s *Store) RevokeTrustedDevice(ctx context.Context, id, userID string) error {
	return s.DeleteRecord(ctx, "trusted_devices", id)
}

func (s *Store) RevokeAllTrustedDevices(ctx context.Context, userID string) error {
	params := url.Values{}
	params.Set("filter", fmt.Sprintf("user_id = '%s'", userID))
	params.Set("perPage", "500")

	var devices []pbTrustedDevice
	_, _ = s.ListRecords(ctx, "trusted_devices", params, &devices)
	for _, d := range devices {
		_ = s.DeleteRecord(ctx, "trusted_devices", d.ID)
	}
	return nil
}
