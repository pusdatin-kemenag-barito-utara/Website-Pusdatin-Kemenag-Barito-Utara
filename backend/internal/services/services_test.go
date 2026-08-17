package services

import (
	"context"
	"testing"

	"pusdatin/backend/internal/domain"
)

type mockAppRepo struct {
	apps   map[string]*domain.App
	status map[string]string
}

func newMockAppRepo() *mockAppRepo {
	return &mockAppRepo{
		apps:   make(map[string]*domain.App),
		status: make(map[string]string),
	}
}

func (m *mockAppRepo) ListApps(ctx context.Context) ([]*domain.App, error) {
	var list []*domain.App
	for _, a := range m.apps {
		list = append(list, a)
	}
	return list, nil
}

func (m *mockAppRepo) ListOnlineApps(ctx context.Context) ([]*domain.App, error) {
	var list []*domain.App
	for _, a := range m.apps {
		if a.Status == "online" {
			list = append(list, a)
		}
	}
	return list, nil
}

func (m *mockAppRepo) GetApp(ctx context.Context, id string) (*domain.App, error) {
	if a, ok := m.apps[id]; ok {
		return a, nil
	}
	return nil, domain.ErrNotFound
}

func (m *mockAppRepo) GetAppStatus(ctx context.Context, id string) (string, error) {
	if s, ok := m.status[id]; ok {
		return s, nil
	}
	return "online", nil
}

func (m *mockAppRepo) AppExists(ctx context.Context, id string) (bool, error) {
	_, ok := m.apps[id]
	return ok, nil
}

func (m *mockAppRepo) CreateApp(ctx context.Context, app *domain.App) error {
	m.apps[app.ID] = app
	m.status[app.ID] = app.Status
	return nil
}

func (m *mockAppRepo) UpdateApp(ctx context.Context, id string, fields map[string]any) error {
	if a, ok := m.apps[id]; ok {
		if name, ok := fields["name"].(string); ok {
			a.Name = name
		}
		return nil
	}
	return domain.ErrNotFound
}

func (m *mockAppRepo) UpdateAppStatus(ctx context.Context, id, status string) error {
	m.status[id] = status
	if a, ok := m.apps[id]; ok {
		a.Status = status
	}
	return nil
}

func (m *mockAppRepo) UpdateAllAppsStatus(ctx context.Context, status string) error {
	for id := range m.apps {
		m.apps[id].Status = status
		m.status[id] = status
	}
	return nil
}

func (m *mockAppRepo) DeleteApp(ctx context.Context, id string) error {
	delete(m.apps, id)
	delete(m.status, id)
	return nil
}

type mockAuditRepo struct {
	logs []domain.AuditLog
}

func (m *mockAuditRepo) ListAuditLogs(ctx context.Context, f domain.AuditFilter) ([]domain.AuditLog, int64, error) {
	return m.logs, int64(len(m.logs)), nil
}

func (m *mockAuditRepo) DeleteAuditLogs(ctx context.Context, targetSchema string) (int64, error) {
	count := int64(len(m.logs))
	m.logs = nil
	return count, nil
}

func (m *mockAuditRepo) InsertAuditLog(ctx context.Context, action, target, targetSchema, performedBy string, before, after any, ip string) error {
	m.logs = append(m.logs, domain.AuditLog{
		Action:      action,
		Target:      target,
		PerformedBy: performedBy,
	})
	return nil
}

func TestAppServiceCreateAndStatus(t *testing.T) {
	ctx := context.Background()
	appRepo := newMockAppRepo()
	auditRepo := &mockAuditRepo{}

	service := NewAppService(appRepo, auditRepo)

	// Test validation error
	_, err := service.CreateApp(ctx, "admin@kemenag.go.id", "127.0.0.1", CreateAppInput{})
	if err != domain.ErrInvalidInput {
		t.Fatalf("expected ErrInvalidInput, got %v", err)
	}

	// Test successful creation
	created, err := service.CreateApp(ctx, "admin@kemenag.go.id", "127.0.0.1", CreateAppInput{
		ID:     "ptsp-online",
		Name:   "PTSP Online",
		Schema: "kemenag_ptsp",
		Status: "online",
	})
	if err != nil {
		t.Fatalf("failed to create app: %v", err)
	}
	if created.ID != "ptsp-online" || created.Name != "PTSP Online" {
		t.Fatalf("unexpected app data: %+v", created)
	}

	// Test duplicate creation error
	_, err = service.CreateApp(ctx, "admin@kemenag.go.id", "127.0.0.1", CreateAppInput{
		ID:     "ptsp-online",
		Name:   "PTSP Duplicate",
		Schema: "kemenag_ptsp",
	})
	if err != domain.ErrAlreadyExists {
		t.Fatalf("expected ErrAlreadyExists, got %v", err)
	}

	// Test update status
	err = service.UpdateAppStatus(ctx, "admin@kemenag.go.id", "127.0.0.1", "ptsp-online", "maintenance")
	if err != nil {
		t.Fatalf("failed to update status: %v", err)
	}
	status, _ := service.GetAppStatus(ctx, "ptsp-online")
	if status != "maintenance" {
		t.Fatalf("expected status maintenance, got %s", status)
	}
}

func TestSanitizeReturnURL(t *testing.T) {
	cases := []struct {
		input    string
		expected string
	}{
		{"", ""},
		{"https://evil.com", ""},
		{"//evil.com", ""},
		{"/login", ""},
		{"/maintenance", ""},
		{"/dashboard", "/dashboard"},
		{"/admin/users", "/admin/users"},
	}

	for _, c := range cases {
		got := SanitizeReturnURL(c.input)
		if got != c.expected {
			t.Errorf("SanitizeReturnURL(%q) = %q, expected %q", c.input, got, c.expected)
		}
	}
}
