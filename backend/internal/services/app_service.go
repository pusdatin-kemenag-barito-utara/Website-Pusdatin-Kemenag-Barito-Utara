package services

import (
	"context"
	"log"
	"strings"
	"time"

	"pusdatin/backend/internal/config"
	"pusdatin/backend/internal/domain"
)

type AppService struct {
	cfg       *config.Config
	appRepo   domain.AppRepository
	cfService *CloudflareService
}

func NewAppService(cfg *config.Config, appRepo domain.AppRepository, cfService *CloudflareService) *AppService {
	return &AppService{
		cfg:       cfg,
		appRepo:   appRepo,
		cfService: cfService,
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

	if err := s.appRepo.UpdateApp(ctx, id, fields); err != nil {
		return err
	}

	return nil
}

func (s *AppService) UpdateAppStatus(ctx context.Context, actorEmail, clientIP, id, status string) error {
	if !ValidAppStatus(status) {
		return domain.ErrInvalidInput
	}

	app, _ := s.appRepo.GetApp(ctx, id)

	if err := s.appRepo.UpdateAppStatus(ctx, id, status); err != nil {
		return err
	}

	if s.cfService != nil && app != nil && app.URL != nil {
		host := ExtractHost(*app.URL)
		if s.cfService.IsCloudflareManaged(host) {
			go func() {
				bgCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
				defer cancel()
				if err := s.cfService.SyncAppMaintenance(bgCtx, host, app.Name, status == "maintenance"); err != nil {
					log.Printf("⚠️ [AppService] Gagal sync Cloudflare untuk %s: %v", host, err)
				}
			}()
		} else if strings.Contains(host, "baritoutara.kemenag.go.id") {
			targetDB := "https://db-website.kemenag-baritoutara.com"
			if app.SchemaURL != nil && *app.SchemaURL != "" && strings.HasPrefix(*app.SchemaURL, "http") {
				targetDB = *app.SchemaURL
			}
			go func() {
				bgCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
				defer cancel()
				_ = s.cfService.SyncWebsiteDatabase(bgCtx, targetDB, s.cfg.PocketBaseAdminEmail, s.cfg.PocketBaseAdminPassword, status)
			}()
		}
	}

	return nil
}

func (s *AppService) BulkUpdateAppStatus(ctx context.Context, actorEmail, clientIP, status string) error {
	if !ValidAppStatus(status) {
		return domain.ErrInvalidInput
	}

	apps, _ := s.appRepo.ListApps(ctx)

	if err := s.appRepo.UpdateAllAppsStatus(ctx, status); err != nil {
		return err
	}

	if s.cfService != nil && len(apps) > 0 {
		go func() {
			bgCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			if err := s.cfService.SyncBulkMaintenance(bgCtx, apps, status); err != nil {
				log.Printf("⚠️ [AppService] Gagal bulk sync Cloudflare: %v", err)
			}
			for _, a := range apps {
				if a != nil && a.URL != nil && strings.Contains(*a.URL, "baritoutara.kemenag.go.id") {
					targetDB := "https://db-website.kemenag-baritoutara.com"
					if a.SchemaURL != nil && *a.SchemaURL != "" && strings.HasPrefix(*a.SchemaURL, "http") {
						targetDB = *a.SchemaURL
					}
					_ = s.cfService.SyncWebsiteDatabase(bgCtx, targetDB, s.cfg.PocketBaseAdminEmail, s.cfg.PocketBaseAdminPassword, status)
				}
			}
		}()
	}

	return nil
}

func (s *AppService) DeleteApp(ctx context.Context, actorEmail, clientIP, id string) error {
	if id == "" {
		return domain.ErrInvalidInput
	}

	if err := s.appRepo.DeleteApp(ctx, id); err != nil {
		return err
	}

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
