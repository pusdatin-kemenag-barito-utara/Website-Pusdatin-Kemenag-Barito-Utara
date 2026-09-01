package domain

import (
	"context"
	"time"
)

// UserRepository specifies data access operations for user profiles and permissions.
type UserRepository interface {
	GetUser(ctx context.Context, id string) (*User, error)
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	GetUserRole(ctx context.Context, id string) (role string, status string, err error)
	GetUserPermissions(ctx context.Context, userID string) ([]AppPermission, error)
}

// AppRepository specifies data access operations for satellite applications.
type AppRepository interface {
	ListApps(ctx context.Context) ([]*App, error)
	ListOnlineApps(ctx context.Context) ([]*App, error)
	GetApp(ctx context.Context, id string) (*App, error)
	GetAppStatus(ctx context.Context, id string) (string, error)
	AppExists(ctx context.Context, id string) (bool, error)
	CreateApp(ctx context.Context, app *App) error
	UpdateApp(ctx context.Context, id string, fields map[string]any) error
	UpdateAppStatus(ctx context.Context, id, status string) error
	UpdateAllAppsStatus(ctx context.Context, status string) error
	DeleteApp(ctx context.Context, id string) error
}

// AuditRepository specifies data access operations for system audit trails.
type AuditRepository interface {
	ListAuditLogs(ctx context.Context, f AuditFilter) ([]AuditLog, int64, error)
	DeleteAuditLogs(ctx context.Context, targetSchema string) (int64, error)
	DeleteAuditLogsBatch(ctx context.Context, ids []string) (int64, error)
	InsertAuditLog(ctx context.Context, action, target, targetSchema, performedBy string, before, after any, ip string) error
}

// ReportRepository specifies data access operations for aggregate statistics.
type ReportRepository interface {
	ReportActivity(ctx context.Context, days int) ([]ActivityPoint, error)
	ReportAppSummary(ctx context.Context) ([]AppSummaryItem, error)
	DashboardStats(ctx context.Context) (*DashboardStats, error)
}

// LandingRepository specifies data access operations for public landing counters.
type LandingRepository interface {
	LandingStats(ctx context.Context) (*LandingStats, error)
}

// TrustedDeviceRepository specifies data access operations for remembered devices.
type TrustedDeviceRepository interface {
	CreateTrustedDeviceWithIP(ctx context.Context, id, userID, deviceName, tokenHash string, expiresAt time.Time, ipAddress any) error
	GetValidTrustedDevice(ctx context.Context, id, userID string) (*TrustedDevice, error)
	TouchTrustedDevice(ctx context.Context, id string) error
	RevokeTrustedDevice(ctx context.Context, id, userID string) error
	RevokeAllTrustedDevices(ctx context.Context, userID string) error
}

// SystemRepository specifies data access operations for persisted system health metrics.
type SystemRepository interface {
	LatestSystemMetrics(ctx context.Context) (*SystemHealth, error)
	SaveSystemMetrics(ctx context.Context, h SystemHealth) error
	Ping(ctx context.Context) error
}

// AnnouncementRepository specifies data access operations for announcements.
type AnnouncementRepository interface {
	ListAnnouncements(ctx context.Context, search string) ([]*Announcement, error)
	ListPublicAnnouncements(ctx context.Context) ([]*Announcement, error)
	GetAnnouncement(ctx context.Context, id string) (*Announcement, error)
	CreateAnnouncement(ctx context.Context, a *Announcement) error
	UpdateAnnouncement(ctx context.Context, id string, fields map[string]any) error
	DeleteAnnouncement(ctx context.Context, id string) error
}
