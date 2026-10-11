package database

import (
	"context"
	"net/url"

	"pusdatin/backend/internal/domain"
)

func (s *Store) LandingStats(ctx context.Context) (*domain.LandingStats, error) {
	st := &domain.LandingStats{
		SystemHealthPercent: 100,
	}

	p1 := url.Values{}
	p1.Set("perPage", "1")
	st.TotalAppsCount, _ = s.ListRecords(ctx, "satellite_apps", p1, nil)

	p2 := url.Values{}
	p2.Set("perPage", "1")
	p2.Set("filter", "status = 'online'")
	st.OnlineAppsCount, _ = s.ListRecords(ctx, "satellite_apps", p2, nil)

	p3 := url.Values{}
	p3.Set("perPage", "1")
	p3.Set("filter", "is_active = true")
	st.TotalAnnouncements, _ = s.ListRecords(ctx, "announcements", p3, nil)

	p4 := url.Values{}
	p4.Set("perPage", "1")
	st.TotalAuditLogs, _ = s.ListRecords(ctx, "audit_logs", p4, nil)

	p5 := url.Values{}
	p5.Set("perPage", "1")
	p5.Set("filter", "role = 'super_admin'")
	st.SuperAdminCount, _ = s.ListRecords(ctx, "profiles", p5, nil)

	return st, nil
}
