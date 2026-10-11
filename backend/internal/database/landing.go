package database

import (
	"context"
	"net/url"
	"sync"

	"pusdatin/backend/internal/domain"
)

func (s *Store) LandingStats(ctx context.Context) (*domain.LandingStats, error) {
	st := &domain.LandingStats{
		TotalAppsCount:      11,
		OnlineAppsCount:     11,
		TotalAnnouncements:  3,
		SuperAdminCount:     1,
		SystemHealthPercent: 100,
	}

	var wg sync.WaitGroup
	wg.Add(4)

	go func() {
		defer wg.Done()
		p1 := url.Values{}
		p1.Set("perPage", "1")
		if total, err := s.ListRecords(ctx, "satellite_apps", p1, nil); err == nil && total > 0 {
			st.TotalAppsCount = total
		}
	}()

	go func() {
		defer wg.Done()
		p2 := url.Values{}
		p2.Set("perPage", "1")
		p2.Set("filter", "status = 'online'")
		if online, err := s.ListRecords(ctx, "satellite_apps", p2, nil); err == nil && online > 0 {
			st.OnlineAppsCount = online
		}
	}()

	go func() {
		defer wg.Done()
		p3 := url.Values{}
		p3.Set("perPage", "1")
		p3.Set("filter", "is_active = true")
		if ann, err := s.ListRecords(ctx, "announcements", p3, nil); err == nil {
			st.TotalAnnouncements = ann
		}
	}()

	go func() {
		defer wg.Done()
		p5 := url.Values{}
		p5.Set("perPage", "1")
		p5.Set("filter", "role = 'super_admin'")
		if admin, err := s.ListRecords(ctx, "profiles", p5, nil); err == nil && admin > 0 {
			st.SuperAdminCount = admin
		}
	}()

	wg.Wait()
	return st, nil
}
