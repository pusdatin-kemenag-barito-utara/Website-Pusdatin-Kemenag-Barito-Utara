package database

import (
	"context"
	"fmt"
	"net/url"
	"time"

	"pusdatin/backend/internal/domain"
)

type pbApp struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	Description       string `json:"description"`
	Icon              string `json:"icon"`
	URL               string `json:"url"`
	SchemaName        string `json:"schema_name"`
	SchemaURL         string `json:"schema_url"`
	Status            string `json:"status"`
	LastHealthCheck   string `json:"last_health_check"`
	SortOrder         int32  `json:"sort_order"`
	AvailableFeatures []any  `json:"available_features"`
	CreatedAt         string `json:"created_at"`
	Created           string `json:"created"`
}

func (p *pbApp) toDomainApp() *domain.App {
	a := &domain.App{
		ID:                p.ID,
		Name:              p.Name,
		SchemaName:        p.SchemaName,
		Status:            p.Status,
		SortOrder:         p.SortOrder,
		AvailableFeatures: p.AvailableFeatures,
	}
	if a.AvailableFeatures == nil {
		a.AvailableFeatures = []any{}
	}
	if p.Description != "" {
		a.Description = &p.Description
	}
	if p.Icon != "" {
		a.Icon = &p.Icon
	}
	if p.URL != "" {
		a.URL = &p.URL
	}
	if p.SchemaURL != "" {
		a.SchemaURL = &p.SchemaURL
	}
	if p.LastHealthCheck != "" {
		a.LastHealthCheck = &p.LastHealthCheck
	}
	cAt := p.CreatedAt
	if cAt == "" {
		cAt = p.Created
	}
	a.CreatedAt = cAt
	return a
}

func (s *Store) ListApps(ctx context.Context) ([]*domain.App, error) {
	params := url.Values{}
	params.Set("sort", "+sort_order")
	params.Set("perPage", "500")

	var records []pbApp
	if _, err := s.ListRecords(ctx, "satellite_apps", params, &records); err != nil {
		return nil, err
	}

	apps := make([]*domain.App, len(records))
	for i := range records {
		apps[i] = records[i].toDomainApp()
	}
	return apps, nil
}

func (s *Store) ListOnlineApps(ctx context.Context) ([]*domain.App, error) {
	params := url.Values{}
	params.Set("filter", "status = 'online'")
	params.Set("sort", "+sort_order")
	params.Set("perPage", "500")

	var records []pbApp
	if _, err := s.ListRecords(ctx, "satellite_apps", params, &records); err != nil {
		return nil, err
	}

	apps := make([]*domain.App, len(records))
	for i := range records {
		apps[i] = records[i].toDomainApp()
	}
	return apps, nil
}

func (s *Store) GetApp(ctx context.Context, id string) (*domain.App, error) {
	var record pbApp
	if err := s.GetRecord(ctx, "satellite_apps", id, &record); err != nil {
		return nil, fmt.Errorf("app not found: %w", err)
	}
	return record.toDomainApp(), nil
}

func (s *Store) GetAppStatus(ctx context.Context, id string) (string, error) {
	app, err := s.GetApp(ctx, id)
	if err != nil {
		return "", err
	}
	return app.Status, nil
}

func (s *Store) AppExists(ctx context.Context, id string) (bool, error) {
	var record pbApp
	if err := s.GetRecord(ctx, "satellite_apps", id, &record); err != nil {
		return false, nil
	}
	return record.ID != "", nil
}

func (s *Store) CreateApp(ctx context.Context, app *domain.App) error {
	payload := map[string]any{
		"id":                 app.ID,
		"name":               app.Name,
		"schema_name":        app.SchemaName,
		"status":             app.Status,
		"sort_order":         app.SortOrder,
		"available_features": app.AvailableFeatures,
	}
	if app.Description != nil {
		payload["description"] = *app.Description
	}
	if app.Icon != nil {
		payload["icon"] = *app.Icon
	}
	if app.URL != nil {
		payload["url"] = *app.URL
	}
	if app.SchemaURL != nil {
		payload["schema_url"] = *app.SchemaURL
	}
	return s.CreateRecord(ctx, "satellite_apps", payload, nil)
}

func (s *Store) UpdateApp(ctx context.Context, id string, fields map[string]any) error {
	if len(fields) == 0 {
		return nil
	}
	return s.UpdateRecord(ctx, "satellite_apps", id, fields, nil)
}

func (s *Store) UpdateAppStatus(ctx context.Context, id, status string) error {
	now := time.Now().UTC().Format("2006-01-02 15:04:05.000Z")
	return s.UpdateRecord(ctx, "satellite_apps", id, map[string]any{
		"status":            status,
		"last_health_check": now,
	}, nil)
}

func (s *Store) UpdateAllAppsStatus(ctx context.Context, status string) error {
	apps, err := s.ListApps(ctx)
	if err != nil {
		return err
	}
	now := time.Now().UTC().Format("2006-01-02 15:04:05.000Z")
	for _, a := range apps {
		_ = s.UpdateRecord(ctx, "satellite_apps", a.ID, map[string]any{
			"status":            status,
			"last_health_check": now,
		}, nil)
	}
	return nil
}

func (s *Store) DeleteApp(ctx context.Context, id string) error {
	return s.DeleteRecord(ctx, "satellite_apps", id)
}
