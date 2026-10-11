package database

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"pusdatin/backend/internal/domain"
)

type pbAnnouncement struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Tag         string `json:"tag"`
	Description string `json:"description"`
	IsImportant bool   `json:"is_important"`
	IsActive    bool   `json:"is_active"`
	OrderIndex  int    `json:"order_index"`
	CreatedBy   string `json:"created_by"`
	CreatedAt   string `json:"created_at"`
	UpdatedAt   string `json:"updated_at"`
	Created     string `json:"created"`
	Updated     string `json:"updated"`
}

func (p *pbAnnouncement) toDomain() *domain.Announcement {
	a := &domain.Announcement{
		ID:          p.ID,
		Title:       p.Title,
		Tag:         p.Tag,
		Description: p.Description,
		IsImportant: p.IsImportant,
		IsActive:    p.IsActive,
		OrderIndex:  p.OrderIndex,
	}
	if p.CreatedBy != "" {
		a.CreatedBy = &p.CreatedBy
	}
	cAt := p.CreatedAt
	if cAt == "" {
		cAt = p.Created
	}
	a.CreatedAt = cAt

	uAt := p.UpdatedAt
	if uAt == "" {
		uAt = p.Updated
	}
	a.UpdatedAt = uAt

	return a
}

func (s *Store) ListAnnouncements(ctx context.Context, search string) ([]*domain.Announcement, error) {
	params := url.Values{}
	params.Set("sort", "-is_important,+order_index,-created_at")
	params.Set("perPage", "500")

	var records []pbAnnouncement
	if _, err := s.ListRecords(ctx, "announcements", params, &records); err != nil {
		return nil, err
	}

	list := make([]*domain.Announcement, 0, len(records))
	needle := strings.ToLower(strings.TrimSpace(search))

	for i := range records {
		item := records[i].toDomain()
		if needle != "" {
			if !strings.Contains(strings.ToLower(item.Title), needle) &&
				!strings.Contains(strings.ToLower(item.Tag), needle) &&
				!strings.Contains(strings.ToLower(item.Description), needle) {
				continue
			}
		}
		list = append(list, item)
	}
	return list, nil
}

func (s *Store) ListPublicAnnouncements(ctx context.Context) ([]*domain.Announcement, error) {
	params := url.Values{}
	params.Set("filter", "is_active = true")
	params.Set("sort", "-is_important,+order_index,-created_at")
	params.Set("perPage", "500")

	var records []pbAnnouncement
	if _, err := s.ListRecords(ctx, "announcements", params, &records); err != nil {
		return nil, err
	}

	list := make([]*domain.Announcement, len(records))
	for i := range records {
		list[i] = records[i].toDomain()
	}
	return list, nil
}

func (s *Store) GetAnnouncement(ctx context.Context, id string) (*domain.Announcement, error) {
	var record pbAnnouncement
	if err := s.GetRecord(ctx, "announcements", id, &record); err != nil {
		return nil, fmt.Errorf("announcement not found: %w", err)
	}
	return record.toDomain(), nil
}

func (s *Store) CreateAnnouncement(ctx context.Context, a *domain.Announcement) error {
	now := time.Now().UTC().Format("2006-01-02 15:04:05.000Z")
	payload := map[string]any{
		"title":        a.Title,
		"tag":          a.Tag,
		"description":  a.Description,
		"is_important": a.IsImportant,
		"is_active":    a.IsActive,
		"order_index":  a.OrderIndex,
		"created_at":   now,
		"updated_at":   now,
	}
	if a.ID != "" {
		payload["id"] = a.ID
	}
	if a.CreatedBy != nil {
		payload["created_by"] = *a.CreatedBy
	}

	var created pbAnnouncement
	if err := s.CreateRecord(ctx, "announcements", payload, &created); err != nil {
		return err
	}
	a.ID = created.ID
	a.CreatedAt = created.CreatedAt
	a.UpdatedAt = created.UpdatedAt
	return nil
}

func (s *Store) UpdateAnnouncement(ctx context.Context, id string, fields map[string]any) error {
	if len(fields) == 0 {
		return nil
	}
	fields["updated_at"] = time.Now().UTC().Format("2006-01-02 15:04:05.000Z")
	return s.UpdateRecord(ctx, "announcements", id, fields, nil)
}

func (s *Store) DeleteAnnouncement(ctx context.Context, id string) error {
	return s.DeleteRecord(ctx, "announcements", id)
}

var _ domain.AnnouncementRepository = (*Store)(nil)
