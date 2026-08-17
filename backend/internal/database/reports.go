package database

import (
	"context"
	"fmt"
	"time"
)

func (s *Store) ReportActivity(ctx context.Context, days int) ([]ActivityPoint, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT to_char(DATE(timestamp), 'YYYY-MM-DD'), COUNT(*)::int
		FROM kemenag_pusdatin.audit_logs
		WHERE timestamp >= CURRENT_DATE - ($1 || ' days')::interval
		GROUP BY DATE(timestamp)
		ORDER BY DATE(timestamp) ASC`, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	points := []ActivityPoint{}
	for rows.Next() {
		var p ActivityPoint
		if err := rows.Scan(&p.Date, &p.Count); err != nil {
			return nil, err
		}
		points = append(points, p)
	}
	return points, rows.Err()
}

// ReportAppSummary returns audit counts per satellite app over the last 30 days.
func (s *Store) ReportAppSummary(ctx context.Context) ([]AppSummaryItem, error) {
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)

	appRows, err := s.pool.Query(ctx, `
		SELECT name, schema_name FROM kemenag_pusdatin.satellite_apps ORDER BY sort_order ASC`)
	if err != nil {
		return nil, err
	}
	type appRef struct{ name, schema string }
	apps := []appRef{}
	for appRows.Next() {
		var a appRef
		if err := appRows.Scan(&a.name, &a.schema); err != nil {
			appRows.Close()
			return nil, err
		}
		apps = append(apps, a)
	}
	appRows.Close()
	if err := appRows.Err(); err != nil {
		return nil, err
	}

	counts := map[string]int64{}
	logRows, err := s.pool.Query(ctx, `
		SELECT COALESCE(target_schema, ''), COUNT(*)::bigint
		FROM kemenag_pusdatin.audit_logs
		WHERE timestamp >= $1
		GROUP BY COALESCE(target_schema, '')`, thirtyDaysAgo)
	if err != nil {
		return nil, err
	}
	for logRows.Next() {
		var schema string
		var count int64
		if err := logRows.Scan(&schema, &count); err != nil {
			logRows.Close()
			return nil, err
		}
		counts[schema] = count
	}
	logRows.Close()
	if err := logRows.Err(); err != nil {
		return nil, err
	}

	colors := []string{"#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"}
	result := []AppSummaryItem{}
	for i, app := range apps {
		result = append(result, AppSummaryItem{
			AppName: app.name,
			Count:   counts[app.schema],
			Color:   colors[i%len(colors)],
		})
	}
	return result, nil
}

func (s *Store) DashboardStats(ctx context.Context) (*DashboardStats, error) {
	st := &DashboardStats{}
	var err error

	if err = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM kemenag_pusdatin.profiles`).Scan(&st.TotalUsers); err != nil {
		return nil, fmt.Errorf("total users: %w", err)
	}
	if err = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM kemenag_pusdatin.profiles WHERE status = 'active'`).Scan(&st.ActiveUsers); err != nil {
		return nil, fmt.Errorf("active users: %w", err)
	}
	if err = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM kemenag_pusdatin.satellite_apps`).Scan(&st.TotalApps); err != nil {
		return nil, fmt.Errorf("total apps: %w", err)
	}
	if err = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM kemenag_pusdatin.satellite_apps WHERE status = 'online'`).Scan(&st.OnlineApps); err != nil {
		return nil, fmt.Errorf("online apps: %w", err)
	}
	if err = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM kemenag_pusdatin.audit_logs`).Scan(&st.TotalLogs); err != nil {
		return nil, fmt.Errorf("total logs: %w", err)
	}
	if err = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM kemenag_pusdatin.audit_logs WHERE timestamp >= CURRENT_DATE`).Scan(&st.TodayLogs); err != nil {
		return nil, fmt.Errorf("today logs: %w", err)
	}
	return st, nil
}

// LatestSystemMetrics returns the most recent metrics row for the health endpoint.
func (s *Store) LatestSystemMetrics(ctx context.Context) (*SystemHealth, error) {
	var h SystemHealth
	var uptime *string
	var ts any
	err := s.pool.QueryRow(ctx, `
		SELECT cpu, ram, storage, uptime, recorded_at
		FROM kemenag_pusdatin.system_metrics
		ORDER BY recorded_at DESC LIMIT 1`).
		Scan(&h.CPU, &h.RAM, &h.Storage, &uptime, &ts)
	if err != nil {
		return nil, err
	}
	if uptime != nil {
		h.Uptime = *uptime
	} else {
		h.Uptime = "N/A"
	}
	h.RecordedAt = formatTime(asTime(ts))
	return &h, nil
}

// SaveSystemMetrics persists a metrics snapshot for the health endpoint and keeps only the latest 100 records.
func (s *Store) SaveSystemMetrics(ctx context.Context, h SystemHealth) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO kemenag_pusdatin.system_metrics (cpu, ram, storage, uptime)
		VALUES ($1, $2, $3, $4)`,
		h.CPU, h.RAM, h.Storage, h.Uptime)
	if err != nil {
		return err
	}

	// Auto-prune to keep only the latest 100 snapshots, preventing database bloat
	_, _ = s.pool.Exec(ctx, `
		DELETE FROM kemenag_pusdatin.system_metrics
		WHERE id NOT IN (
			SELECT id FROM kemenag_pusdatin.system_metrics
			ORDER BY recorded_at DESC
			LIMIT 100
		)`)

	return nil
}
