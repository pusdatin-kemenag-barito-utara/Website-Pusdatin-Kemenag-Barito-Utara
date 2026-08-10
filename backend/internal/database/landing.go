package database

import (
	"context"
)

type LandingStats struct {
	TotalAppsCount   int64 `json:"totalAppsCount"`
	LayananMasyarakat int64 `json:"layananMasyarakat"`
	LayananPegawai   int64 `json:"layananPegawai"`
	TotalAdmin       int64 `json:"totalAdmin"`
	TotalPegawai     int64 `json:"totalPegawai"`
	TotalMasyarakat  int64 `json:"totalMasyarakat"`
}

func (s *Store) LandingStats(ctx context.Context) (*LandingStats, error) {
	st := &LandingStats{}

	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM kemenag_pusdatin.satellite_apps`).Scan(&st.TotalAppsCount)
	_ = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM kemenag_ptsp.ptsp_service_items si
		INNER JOIN kemenag_ptsp.ptsp_services sv ON si.service_id = sv.id
		WHERE si.is_active = true AND sv.is_active = true AND sv.category = 'public'`).Scan(&st.LayananMasyarakat)
	_ = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM kemenag_ptsp.ptsp_service_items si
		INNER JOIN kemenag_ptsp.ptsp_services sv ON si.service_id = sv.id
		WHERE si.is_active = true AND sv.is_active = true AND sv.category = 'asn'`).Scan(&st.LayananPegawai)
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM kemenag_pusdatin.profiles WHERE role IN ('super_admin','admin','sub_admin')`).Scan(&st.TotalAdmin)
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM kemenag_pusdatin.profiles_pegawai`).Scan(&st.TotalPegawai)
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM kemenag_pusdatin.profiles_pemohon`).Scan(&st.TotalMasyarakat)
	return st, nil
}
