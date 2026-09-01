package database

import (
	"context"
)

func (s *Store) LandingStats(ctx context.Context) (*LandingStats, error) {
	st := &LandingStats{}

	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM kemenag_pusdatin.satellite_apps`).Scan(&st.TotalAppsCount)
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM kemenag_pusdatin.satellite_apps WHERE status = 'online'`).Scan(&st.OnlineAppsCount)
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM kemenag_pusdatin.announcements WHERE is_active = true`).Scan(&st.TotalAnnouncements)
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM kemenag_pusdatin.audit_logs`).Scan(&st.TotalAuditLogs)
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM kemenag_pusdatin.profiles WHERE role = 'super_admin'`).Scan(&st.SuperAdminCount)
	st.SystemHealthPercent = 100

	return st, nil
}
