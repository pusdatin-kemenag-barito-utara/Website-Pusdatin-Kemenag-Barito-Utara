package services

import (
	"context"

	"pusdatin/backend/internal/domain"
)

type ReportService struct {
	reportRepo  domain.ReportRepository
	auditRepo   domain.AuditRepository
	landingRepo domain.LandingRepository
	appRepo     domain.AppRepository
}

func NewReportService(
	reportRepo domain.ReportRepository,
	auditRepo domain.AuditRepository,
	landingRepo domain.LandingRepository,
	appRepo domain.AppRepository,
) *ReportService {
	return &ReportService{
		reportRepo:  reportRepo,
		auditRepo:   auditRepo,
		landingRepo: landingRepo,
		appRepo:     appRepo,
	}
}

func (s *ReportService) ListAuditLogs(ctx context.Context, f domain.AuditFilter) ([]domain.AuditLog, int64, error) {
	if f.Limit < 1 {
		f.Limit = 50
	}
	if f.Offset < 0 {
		f.Offset = 0
	}
	return s.auditRepo.ListAuditLogs(ctx, f)
}

func (s *ReportService) DeleteAuditLogs(ctx context.Context, targetSchema string) (int64, error) {
	return s.auditRepo.DeleteAuditLogs(ctx, targetSchema)
}

func (s *ReportService) DeleteAuditLogsBatch(ctx context.Context, ids []string) (int64, error) {
	return s.auditRepo.DeleteAuditLogsBatch(ctx, ids)
}

func (s *ReportService) GetActivityReport(ctx context.Context, days int) ([]domain.ActivityPoint, error) {
	if days < 1 {
		days = 7
	}
	return s.reportRepo.ReportActivity(ctx, days)
}

func (s *ReportService) GetAppSummaryReport(ctx context.Context) ([]domain.AppSummaryItem, error) {
	return s.reportRepo.ReportAppSummary(ctx)
}

func (s *ReportService) GetDashboardStats(ctx context.Context) (*domain.DashboardStats, error) {
	return s.reportRepo.DashboardStats(ctx)
}

func (s *ReportService) GetLandingData(ctx context.Context) (*domain.LandingData, error) {
	stats, err := s.landingRepo.LandingStats(ctx)
	if err != nil {
		stats = &domain.LandingStats{
			TotalAppsCount:      0,
			OnlineAppsCount:     0,
			TotalAnnouncements:  0,
			TotalAuditLogs:      0,
			SuperAdminCount:     1,
			SystemHealthPercent: 100,
		}
	}

	apps, err := s.appRepo.ListApps(ctx)
	if err != nil || apps == nil {
		apps = []*domain.App{}
	}

	appSlice := make([]domain.App, 0, len(apps))
	for _, a := range apps {
		if a != nil {
			appSlice = append(appSlice, *a)
		}
	}

	return &domain.LandingData{
		Stats: *stats,
		Apps:  appSlice,
	}, nil
}
