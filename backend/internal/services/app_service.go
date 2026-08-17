package services

import (
	"context"

	"pusdatin/backend/internal/domain"
)

type AppService struct {
	appRepo   domain.AppRepository
	auditRepo domain.AuditRepository
}

func NewAppService(appRepo domain.AppRepository, auditRepo domain.AuditRepository) *AppService {
	return &AppService{
		appRepo:   appRepo,
		auditRepo: auditRepo,
	}
}

type CreateAppInput struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Desc      *string `json:"description"`
	Icon      *string `json:"icon"`
	URL       *string `json:"url"`
	Schema    string  `json:"schemaName"`
	SchemaURL *string `json:"schemaUrl"`
	Status    string  `json:"status"`
	Sort      *int32  `json:"sortOrder"`
}

func (s *AppService) ListApps(ctx context.Context) ([]*domain.App, error) {
	return s.appRepo.ListApps(ctx)
}

func (s *AppService) ListOnlineApps(ctx context.Context) ([]*domain.App, error) {
	return s.appRepo.ListOnlineApps(ctx)
}

func (s *AppService) GetApp(ctx context.Context, id string) (*domain.App, error) {
	return s.appRepo.GetApp(ctx, id)
}

func (s *AppService) GetAppStatus(ctx context.Context, id string) (string, error) {
	return s.appRepo.GetAppStatus(ctx, id)
}

func (s *AppService) CreateApp(ctx context.Context, actorEmail, clientIP string, req CreateAppInput) (*domain.App, error) {
	if req.ID == "" || req.Name == "" || req.Schema == "" {
		return nil, domain.ErrInvalidInput
	}

	exists, err := s.appRepo.AppExists(ctx, req.ID)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, domain.ErrAlreadyExists
	}

	sortOrder := int32(0)
	if req.Sort != nil {
		sortOrder = *req.Sort
	}
	status := req.Status
	if status == "" {
		status = "online"
	}

	app := &domain.App{
		ID:                req.ID,
		Name:              req.Name,
		Description:       req.Desc,
		Icon:              req.Icon,
		URL:               req.URL,
		SchemaName:        req.Schema,
		SchemaURL:         req.SchemaURL,
		Status:            status,
		SortOrder:         sortOrder,
		AvailableFeatures: []any{},
	}

	if err := s.appRepo.CreateApp(ctx, app); err != nil {
		return nil, err
	}

	_ = s.auditRepo.InsertAuditLog(ctx, "INSERT", "app:"+req.Name, "kemenag_pusdatin", actorEmail, nil, map[string]any{
		"id": req.ID, "name": req.Name, "schemaName": req.Schema, "status": status,
	}, clientIP)

	created, err := s.appRepo.GetApp(ctx, req.ID)
	if err != nil {
		created = app
	}
	return created, nil
}

func (s *AppService) UpdateApp(ctx context.Context, actorEmail, clientIP, id string, fields map[string]any) error {
	if len(fields) == 0 {
		return domain.ErrInvalidInput
	}

	before, _ := s.appRepo.GetApp(ctx, id)
	if err := s.appRepo.UpdateApp(ctx, id, fields); err != nil {
		return err
	}

	_ = s.auditRepo.InsertAuditLog(ctx, "UPDATE", "app:"+id, "kemenag_pusdatin", actorEmail, flattenAppBefore(before, fields), fields, clientIP)
	return nil
}

func (s *AppService) UpdateAppStatus(ctx context.Context, actorEmail, clientIP, id, status string) error {
	if !ValidAppStatus(status) {
		return domain.ErrInvalidInput
	}

	app, err := s.appRepo.GetApp(ctx, id)
	if err != nil {
		return domain.ErrNotFound
	}

	if err := s.appRepo.UpdateAppStatus(ctx, id, status); err != nil {
		return err
	}

	oldStatus := app.Status
	_ = s.auditRepo.InsertAuditLog(ctx, "UPDATE", "app:"+app.Name, "kemenag_pusdatin", actorEmail, map[string]any{"status": oldStatus}, map[string]any{"status": status}, clientIP)
	return nil
}

func (s *AppService) BulkUpdateAppStatus(ctx context.Context, actorEmail, clientIP, status string) error {
	if !ValidAppStatus(status) {
		return domain.ErrInvalidInput
	}

	if err := s.appRepo.UpdateAllAppsStatus(ctx, status); err != nil {
		return err
	}

	_ = s.auditRepo.InsertAuditLog(ctx, "UPDATE", "app:all", "kemenag_pusdatin", actorEmail, map[string]any{"status": "mixed"}, map[string]any{"status": status}, clientIP)
	return nil
}

func (s *AppService) DeleteApp(ctx context.Context, actorEmail, clientIP, id string) error {
	if id == "" {
		return domain.ErrInvalidInput
	}

	app, _ := s.appRepo.GetApp(ctx, id)
	if err := s.appRepo.DeleteApp(ctx, id); err != nil {
		return err
	}

	name := id
	if app != nil {
		name = app.Name
	}
	_ = s.auditRepo.InsertAuditLog(ctx, "DELETE", "app:"+name, "kemenag_pusdatin", actorEmail, map[string]any{"id": id}, nil, clientIP)
	return nil
}

func ValidAppStatus(s string) bool {
	return s == "online" || s == "maintenance" || s == "degraded"
}

func flattenAppBefore(app *domain.App, fields map[string]any) map[string]any {
	before := map[string]any{}
	if app == nil {
		return before
	}
	if _, ok := fields["name"]; ok {
		before["name"] = app.Name
	}
	if _, ok := fields["url"]; ok {
		before["url"] = app.URL
	}
	if _, ok := fields["schema_name"]; ok {
		before["schemaName"] = app.SchemaName
	}
	if _, ok := fields["schema_url"]; ok {
		before["schemaUrl"] = app.SchemaURL
	}
	if _, ok := fields["sort_order"]; ok {
		before["sortOrder"] = app.SortOrder
	}
	if _, ok := fields["description"]; ok {
		before["description"] = app.Description
	}
	if _, ok := fields["icon"]; ok {
		before["icon"] = app.Icon
	}
	return before
}
