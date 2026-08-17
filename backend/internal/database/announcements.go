package database

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"

	"pusdatin/backend/internal/domain"
)

func scanAnnouncement(row pgxRow) (*domain.Announcement, error) {
	var a domain.Announcement
	var createdBy *string
	var createdAt, updatedAt any

	if err := row.Scan(
		&a.ID, &a.Title, &a.Tag, &a.Description,
		&a.IsImportant, &a.IsActive, &a.OrderIndex,
		&createdBy, &createdAt, &updatedAt,
	); err != nil {
		return nil, err
	}

	a.CreatedBy = createdBy
	a.CreatedAt = formatTime(asTime(createdAt))
	a.UpdatedAt = formatTime(asTime(updatedAt))
	return &a, nil
}

func (s *Store) ListAnnouncements(ctx context.Context, search string) ([]*domain.Announcement, error) {
	query := `
		SELECT id, title, tag, description, is_important, is_active, order_index, created_by, created_at, updated_at
		FROM kemenag_pusdatin.announcements
		ORDER BY is_important DESC, order_index ASC, created_at DESC`

	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []*domain.Announcement{}
	for rows.Next() {
		a, err := scanAnnouncement(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, a)
	}

	if search != "" {
		needle := strings.ToLower(search)
		filtered := list[:0]
		for _, a := range list {
			if strings.Contains(strings.ToLower(a.Title), needle) ||
				strings.Contains(strings.ToLower(a.Tag), needle) ||
				strings.Contains(strings.ToLower(a.Description), needle) {
				filtered = append(filtered, a)
			}
		}
		list = filtered
	}

	return list, rows.Err()
}

func (s *Store) ListPublicAnnouncements(ctx context.Context) ([]*domain.Announcement, error) {
	query := `
		SELECT id, title, tag, description, is_important, is_active, order_index, created_by, created_at, updated_at
		FROM kemenag_pusdatin.announcements
		WHERE is_active = true
		ORDER BY is_important DESC, order_index ASC, created_at DESC`

	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := []*domain.Announcement{}
	for rows.Next() {
		a, err := scanAnnouncement(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, a)
	}
	return list, rows.Err()
}

func (s *Store) GetAnnouncement(ctx context.Context, id string) (*domain.Announcement, error) {
	query := `
		SELECT id, title, tag, description, is_important, is_active, order_index, created_by, created_at, updated_at
		FROM kemenag_pusdatin.announcements
		WHERE id = $1 LIMIT 1`

	rows, err := s.pool.Query(ctx, query, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	if !rows.Next() {
		return nil, pgx.ErrNoRows
	}
	return scanAnnouncement(rows)
}

func (s *Store) CreateAnnouncement(ctx context.Context, a *domain.Announcement) error {
	query := `
		INSERT INTO kemenag_pusdatin.announcements (
			title, tag, description, is_important, is_active, order_index, created_by
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at`

	var createdAt, updatedAt any
	err := s.pool.QueryRow(ctx, query,
		a.Title, a.Tag, a.Description, a.IsImportant, a.IsActive, a.OrderIndex, a.CreatedBy,
	).Scan(&a.ID, &createdAt, &updatedAt)
	if err != nil {
		return err
	}
	a.CreatedAt = formatTime(asTime(createdAt))
	a.UpdatedAt = formatTime(asTime(updatedAt))
	return nil
}

func (s *Store) UpdateAnnouncement(ctx context.Context, id string, fields map[string]any) error {
	if len(fields) == 0 {
		return nil
	}

	cols := []string{}
	args := []any{}
	idx := 1

	for k, v := range fields {
		cols = append(cols, fmt.Sprintf("%s = $%d", k, idx))
		args = append(args, v)
		idx++
	}
	args = append(args, id)

	query := fmt.Sprintf(`UPDATE kemenag_pusdatin.announcements SET %s, updated_at = now() WHERE id = $%d`,
		strings.Join(cols, ", "), idx)

	_, err := s.pool.Exec(ctx, query, args...)
	return err
}

func (s *Store) DeleteAnnouncement(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM kemenag_pusdatin.announcements WHERE id = $1`, id)
	return err
}

var _ domain.AnnouncementRepository = (*Store)(nil)
