package database

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

func (s *Store) ListApps(ctx context.Context) ([]*App, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, description, icon, url, schema_name, schema_url,
			status, last_health_check, sort_order, available_features, created_at
		FROM kemenag_pusdatin.satellite_apps
		ORDER BY sort_order ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	apps := []*App{}
	for rows.Next() {
		a, err := scanApp(rows)
		if err != nil {
			return nil, err
		}
		apps = append(apps, a)
	}
	return apps, rows.Err()
}

func (s *Store) ListOnlineApps(ctx context.Context) ([]*App, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, description, icon, url, schema_name, schema_url,
			status, last_health_check, sort_order, available_features, created_at
		FROM kemenag_pusdatin.satellite_apps
		WHERE status = 'online'
		ORDER BY sort_order ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	apps := []*App{}
	for rows.Next() {
		a, err := scanApp(rows)
		if err != nil {
			return nil, err
		}
		apps = append(apps, a)
	}
	return apps, rows.Err()
}

func (s *Store) GetApp(ctx context.Context, id string) (*App, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, name, description, icon, url, schema_name, schema_url,
			status, last_health_check, sort_order, available_features, created_at
		FROM kemenag_pusdatin.satellite_apps WHERE id = $1 LIMIT 1`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	if !rows.Next() {
		return nil, fmt.Errorf("app not found")
	}
	return scanApp(rows)
}

func (s *Store) GetAppStatus(ctx context.Context, id string) (string, error) {
	var status string
	err := s.pool.QueryRow(ctx,
		`SELECT status FROM kemenag_pusdatin.satellite_apps WHERE id = $1`, id).Scan(&status)
	return status, err
}

func (s *Store) AppExists(ctx context.Context, id string) (bool, error) {
	var exists bool
	err := s.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM kemenag_pusdatin.satellite_apps WHERE id = $1)`, id).Scan(&exists)
	return exists, err
}

func (s *Store) CreateApp(ctx context.Context, app *App) error {
	features, _ := marshalFeatures(app.AvailableFeatures)
	_, err := s.pool.Exec(ctx, `
		INSERT INTO kemenag_pusdatin.satellite_apps
			(id, name, description, icon, url, schema_name, schema_url, status, sort_order, available_features)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		app.ID, app.Name, app.Description, app.Icon, app.URL, app.SchemaName,
		app.SchemaURL, app.Status, app.SortOrder, features)
	return err
}

func (s *Store) UpdateApp(ctx context.Context, id string, fields map[string]any) error {
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
	query := fmt.Sprintf(`UPDATE kemenag_pusdatin.satellite_apps SET %s WHERE id = $%d`,
		strings.Join(cols, ", "), idx)
	_, err := s.pool.Exec(ctx, query, args...)
	return err
}

func (s *Store) UpdateAppStatus(ctx context.Context, id, status string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE kemenag_pusdatin.satellite_apps
		SET status = $2, last_health_check = now()
		WHERE id = $1`, id, status)
	return err
}

func (s *Store) UpdateAllAppsStatus(ctx context.Context, status string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE kemenag_pusdatin.satellite_apps SET status = $1, last_health_check = now()`, status)
	return err
}

func (s *Store) DeleteApp(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM kemenag_pusdatin.satellite_apps WHERE id = $1`, id)
	return err
}

func scanApp(rows interface{ Scan(dest ...any) error }) (*App, error) {
	var a App
	var desc, icon, url, schemaURL *string
	var lastHealthCheck, createdAt any
	var featuresRaw []byte
	if err := rows.Scan(
		&a.ID, &a.Name, &desc, &icon, &url, &a.SchemaName, &schemaURL,
		&a.Status, &lastHealthCheck, &a.SortOrder, &featuresRaw, &createdAt,
	); err != nil {
		return nil, err
	}
	a.Description = desc
	a.Icon = icon
	a.URL = url
	a.SchemaURL = schemaURL
	if lastHealthCheck != nil {
		if t := asTime(lastHealthCheck); !t.IsZero() {
			ts := formatTime(t)
			a.LastHealthCheck = &ts
		}
	}
	a.AvailableFeatures = parseSliceJSON(featuresRaw)
	if createdAt != nil {
		a.CreatedAt = formatTime(asTime(createdAt))
	}
	return &a, nil
}

// ensure unused import for json (kept for scanApp jsonb usage clarity).
var _ = json.Marshal
