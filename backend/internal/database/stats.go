package database

import (
	"context"
	"net/url"
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

func (s *Store) LatestSystemMetrics(ctx context.Context) (*domain.SystemHealth, error) {
	params := url.Values{}
	params.Set("sort", "-recorded_at")
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
