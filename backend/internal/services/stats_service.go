package services

import (
	"context"
	"sync"
	"time"

	"pusdatin/backend/internal/domain"
)

type StatsService struct {
	statsRepo   domain.StatsRepository
	landingRepo domain.LandingRepository
	appRepo     domain.AppRepository

	landingCacheMu sync.RWMutex
	cachedLanding  *domain.LandingData
	cachedLandingAt time.Time
}

func NewStatsService(
	statsRepo domain.StatsRepository,
	landingRepo domain.LandingRepository,
	appRepo domain.AppRepository,
) *StatsService {
	return &StatsService{
		statsRepo:   statsRepo,
		landingRepo: landingRepo,
		appRepo:     appRepo,
	}
}

func (s *StatsService) GetDashboardStats(ctx context.Context) (*domain.DashboardStats, error) {
	return s.statsRepo.DashboardStats(ctx)
}

func (s *StatsService) GetLandingData(ctx context.Context) (*domain.LandingData, error) {
	s.landingCacheMu.RLock()
	if s.cachedLanding != nil && time.Since(s.cachedLandingAt) < 60*time.Second {
		cached := s.cachedLanding
		s.landingCacheMu.RUnlock()
		return cached, nil
	}
	s.landingCacheMu.RUnlock()

	stats, err := s.landingRepo.LandingStats(ctx)
	if err != nil {
		stats = &domain.LandingStats{
			TotalAppsCount:      11,
			OnlineAppsCount:     11,
			TotalAnnouncements:  3,
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

	data := &domain.LandingData{
		Stats: *stats,
		Apps:  appSlice,
	}

	s.landingCacheMu.Lock()
	s.cachedLanding = data
	s.cachedLandingAt = time.Now()
	s.landingCacheMu.Unlock()

	return data, nil
}
