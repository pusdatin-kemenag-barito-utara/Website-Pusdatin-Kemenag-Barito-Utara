package database

import (
	"context"
	"fmt"
	"net/url"
	"sort"
	"time"

	"pusdatin/backend/internal/domain"
)

type pbSystemMetric struct {
	ID         string `json:"id"`
	CPU        int    `json:"cpu"`
	RAM        int    `json:"ram"`
	Storage    int    `json:"storage"`
	Uptime     string `json:"uptime"`
	RecordedAt string `json:"recorded_at"`
	Created    string `json:"created"`
}

func (s *Store) ReportActivity(ctx context.Context, days int) ([]domain.ActivityPoint, error) {
	if days <= 0 {
		days = 7
	}
	cutoff := time.Now().AddDate(0, 0, -days).Format("2006-01-02")
	params := url.Values{}
	params.Set("filter", fmt.Sprintf("timestamp >= '%s'", cutoff))
	params.Set("perPage", "1000")

	var logs []pbAuditLog
	_, err := s.ListRecords(ctx, "audit_logs", params, &logs)
	if err != nil {
		return nil, err
	}

	dateCounts := make(map[string]int)
	for _, l := range logs {
		ts := l.Timestamp
		if ts == "" {
			ts = l.Created
		}
		if len(ts) >= 10 {
			dateStr := ts[:10]
			dateCounts[dateStr]++
		}
	}

	var dates []string
	for d := range dateCounts {
		dates = append(dates, d)
	}
	sort.Strings(dates)

	points := make([]domain.ActivityPoint, len(dates))
	for i, d := range dates {
		points[i] = domain.ActivityPoint{
			Date:  d,
			Count: dateCounts[d],
		}
	}
	return points, nil
}

func (s *Store) ReportAppSummary(ctx context.Context) ([]domain.AppSummaryItem, error) {
	apps, err := s.ListApps(ctx)
	if err != nil {
		return nil, err
	}

	cutoff := time.Now().AddDate(0, 0, -30).Format("2006-01-02")
	params := url.Values{}
	params.Set("filter", fmt.Sprintf("timestamp >= '%s'", cutoff))
	params.Set("perPage", "1000")

	var logs []pbAuditLog
	_, _ = s.ListRecords(ctx, "audit_logs", params, &logs)

	counts := make(map[string]int64)
	for _, l := range logs {
		counts[l.TargetSchema]++
	}

	colors := []string{"#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"}
	result := make([]domain.AppSummaryItem, len(apps))
	for i, app := range apps {
		result[i] = domain.AppSummaryItem{
			AppName: app.Name,
			Count:   counts[app.SchemaName],
			Color:   colors[i%len(colors)],
		}
	}
	return result, nil
}

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

	p4 := url.Values{}
	p4.Set("perPage", "1")
	st.TotalLogs, _ = s.ListRecords(ctx, "audit_logs", p4, nil)

	today := time.Now().Format("2006-01-02")
	p5 := url.Values{}
	p5.Set("perPage", "1")
	p5.Set("filter", fmt.Sprintf("timestamp >= '%s'", today))
	st.TodayLogs, _ = s.ListRecords(ctx, "audit_logs", p5, nil)

	p6 := url.Values{}
	p6.Set("perPage", "1")
	p6.Set("filter", "role = 'super_admin'")
	st.SuperAdminCount, _ = s.ListRecords(ctx, "profiles", p6, nil)
	if st.SuperAdminCount == 0 {
		st.SuperAdminCount = 1
	}

	return st, nil
}

func (s *Store) LatestSystemMetrics(ctx context.Context) (*domain.SystemHealth, error) {
	params := url.Values{}
	params.Set("sort", "-created")
	params.Set("perPage", "1")

	var metrics []pbSystemMetric
	total, err := s.ListRecords(ctx, "system_metrics", params, &metrics)
	if err != nil || total == 0 || len(metrics) == 0 {
		return &domain.SystemHealth{
			CPU:        0,
			RAM:        0,
			Storage:    0,
			Uptime:     "N/A",
			RecordedAt: time.Now().UTC().Format(time.RFC3339),
		}, nil
	}

	m := metrics[0]
	rAt := m.RecordedAt
	if rAt == "" {
		rAt = m.Created
	}
	return &domain.SystemHealth{
		CPU:        m.CPU,
		RAM:        m.RAM,
		Storage:    m.Storage,
		Uptime:     m.Uptime,
		RecordedAt: rAt,
	}, nil
}

func (s *Store) SaveSystemMetrics(ctx context.Context, h domain.SystemHealth) error {
	now := time.Now().UTC().Format("2006-01-02 15:04:05.000Z")
	payload := map[string]any{
		"cpu":         h.CPU,
		"ram":         h.RAM,
		"storage":     h.Storage,
		"uptime":      h.Uptime,
		"recorded_at": now,
	}
	return s.CreateRecord(ctx, "system_metrics", payload, nil)
}
