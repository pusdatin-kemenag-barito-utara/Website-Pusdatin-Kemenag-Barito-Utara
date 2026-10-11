package database

import (
	"context"
	"fmt"
	"net/url"
	"strings"

	"pusdatin/backend/internal/domain"
)

type pbProfile struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	Status    string `json:"status"`
	UserType  string `json:"user_type"`
	Avatar    string `json:"avatar"`
	AvatarURL string `json:"avatar_url"`
	Phone     string `json:"phone"`
	Address   string `json:"address"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
	Created   string `json:"created"`
	Updated   string `json:"updated"`
}

func (p *pbProfile) toDomainUser() *domain.User {
	u := &domain.User{
		ID:             p.ID,
		Name:           p.Name,
		Email:          p.Email,
		Role:           p.Role,
		UserType:       p.UserType,
		Status:         p.Status,
		AppPermissions: []domain.AppPermission{},
	}
	if p.UserType == "" {
		u.UserType = "internal_admin"
	}
	if p.Status == "" {
		u.Status = "active"
	}

	av := p.AvatarURL
	if av == "" {
		av = p.Avatar
	}
	if av != "" {
		u.Avatar = &av
	}

	if p.Phone != "" {
		u.NoHP = &p.Phone
	}
	if p.Address != "" {
		u.Alamat = &p.Address
	}

	cAt := p.CreatedAt
	if cAt == "" {
		cAt = p.Created
	}
	u.CreatedAt = cAt

	uAt := p.UpdatedAt
	if uAt == "" {
		uAt = p.Updated
	}
	u.UpdatedAt = uAt

	return u
}

func (s *Store) GetUser(ctx context.Context, id string) (*domain.User, error) {
	var p pbProfile
	if err := s.GetRecord(ctx, "profiles", id, &p); err != nil {
		return nil, domain.ErrNotFound
	}
	return p.toDomainUser(), nil
}

// GetUserByEmail is used for session context resolution.
func (s *Store) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	email = strings.TrimSpace(email)
	params := url.Values{}
	params.Set("filter", fmt.Sprintf("email = '%s'", strings.ReplaceAll(email, "'", "\\'")))
	params.Set("perPage", "1")

	var profiles []pbProfile
	total, err := s.ListRecords(ctx, "profiles", params, &profiles)
	if err != nil {
		return nil, err
	}
	if total == 0 || len(profiles) == 0 {
		return nil, domain.ErrNotFound
	}
	return profiles[0].toDomainUser(), nil
}

// GetUserRole returns the role (and status) for a profile id.
func (s *Store) GetUserRole(ctx context.Context, id string) (role string, status string, err error) {
	var p pbProfile
	if err := s.GetRecord(ctx, "profiles", id, &p); err != nil {
		return "", "", domain.ErrNotFound
	}
	return p.Role, p.Status, nil
}

func (s *Store) GetUserPermissions(ctx context.Context, userID string) ([]domain.AppPermission, error) {
	return []domain.AppPermission{}, nil
}
