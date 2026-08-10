package database

import (
	"context"
	"time"
)

type TrustedDevice struct {
	ID         string  `json:"id"`
	UserID     string  `json:"userId"`
	DeviceName *string `json:"deviceName"`
	TokenHash  string  `json:"tokenHash"`
	LastUsedAt *string `json:"lastUsedAt"`
	ExpiresAt  *string `json:"expiresAt"`
	CreatedAt  string  `json:"createdAt"`
	IPAddress  *string `json:"ipAddress"`
}

func (s *Store) CreateTrustedDeviceWithIP(ctx context.Context, id, userID, deviceName, tokenHash string, expiresAt time.Time, ipAddress any) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO kemenag_pusdatin.trusted_devices (id, user_id, device_name, token_hash, expires_at, ip_address)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO NOTHING`, id, userID, deviceName, tokenHash, expiresAt, ipAddress)
	return err
}

// GetValidTrustedDevice returns a non-expired trusted device for the user.
func (s *Store) GetValidTrustedDevice(ctx context.Context, id, userID string) (*TrustedDevice, error) {
	var d TrustedDevice
	var name, lastUsed, expiresAt, ip *string
	var ts any
	err := s.pool.QueryRow(ctx, `
		SELECT id, user_id, device_name, token_hash, last_used_at, expires_at, created_at, ip_address
		FROM kemenag_pusdatin.trusted_devices
		WHERE id = $1 AND user_id = $2 AND expires_at > now()
		LIMIT 1`, id, userID).
		Scan(&d.ID, &d.UserID, &name, &d.TokenHash, &lastUsed, &expiresAt, &ts, &ip)
	if err != nil {
		return nil, err
	}
	d.DeviceName = name
	d.IPAddress = ip
	if lastUsed != nil {
		t := formatTime(asTime(*lastUsed))
		d.LastUsedAt = &t
	}
	if expiresAt != nil {
		t := formatTime(asTime(*expiresAt))
		d.ExpiresAt = &t
	}
	d.CreatedAt = formatTime(asTime(ts))
	return &d, nil
}

func (s *Store) TouchTrustedDevice(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE kemenag_pusdatin.trusted_devices SET last_used_at = now() WHERE id = $1`, id)
	return err
}

func (s *Store) RevokeTrustedDevice(ctx context.Context, id, userID string) error {
	_, err := s.pool.Exec(ctx, `
		DELETE FROM kemenag_pusdatin.trusted_devices WHERE id = $1 AND user_id = $2`, id, userID)
	return err
}

func (s *Store) RevokeAllTrustedDevices(ctx context.Context, userID string) error {
	_, err := s.pool.Exec(ctx, `
		DELETE FROM kemenag_pusdatin.trusted_devices WHERE user_id = $1`, userID)
	return err
}
