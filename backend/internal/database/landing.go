package database

import (
	"context"
)

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
