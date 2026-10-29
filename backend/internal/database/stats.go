package database

import (
	"context"
	"net/url"

	"pusdatin/backend/internal/domain"
)

func (s *Store) DashboardStats(ctx context.Context) (*domain.DashboardStats, error) {
	st := &domain.DashboardStats{}

	p1 := url.Values{}
	p1.Set("perPage", "1")
	st.TotalApps, _ = s.ListRecords(ctx, "satellite_apps", p1, nil)

	p2 := url.Values{}
	p2.Set("perPage", "1")
	p2.Set("filter", "status = 'online'")
	st.OnlineApps, _ = s.ListRecords(ctx, "satellite_apps", p2, nil)

	p3 := url.Values{}
	p3.Set("perPage", "1")
	p3.Set("filter", "is_active = true")
	st.TotalAnnouncements, _ = s.ListRecords(ctx, "announcements", p3, nil)

	st.TotalLogs = 0
	st.TodayLogs = 0

	p6 := url.Values{}
	p6.Set("perPage", "1")
	p6.Set("filter", "role = 'super_admin'")
	st.SuperAdminCount, _ = s.ListRecords(ctx, "profiles", p6, nil)
	if st.SuperAdminCount == 0 {
		st.SuperAdminCount = 1
	}

	return st, nil
}
