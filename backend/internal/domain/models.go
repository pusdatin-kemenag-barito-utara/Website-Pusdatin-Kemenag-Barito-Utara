package domain

import "time"

// AppPermission defines access permissions for satellite apps.
type AppPermission struct {
	AppID    string `json:"appId"`
	Role     string `json:"role"`
	AppName  string `json:"appName"`
	Features []any  `json:"features"`
}

// User represents a user profile within the system.
type User struct {
	ID              string          `json:"id"`
	Name            string          `json:"name"`
	Email           string          `json:"email"`
	Role            string          `json:"role"`
	UserType        string          `json:"userType"`
	Status          string          `json:"status"`
	Avatar          *string         `json:"avatar"`
	NIP             *string         `json:"nip"`
	Jabatan         *string         `json:"jabatan"`
	PangkatGolongan *string         `json:"pangkatGolongan"`
	UnitKerja       *string         `json:"unitKerja"`
	NoHP            *string         `json:"noHp"`
	Alamat          *string         `json:"alamat"`
	NIK             *string         `json:"nik"`
	Pekerjaan       *string         `json:"pekerjaan"`
	CreatedAt       string          `json:"createdAt"`
	UpdatedAt       string          `json:"updatedAt"`
	AppPermissions  []AppPermission `json:"appPermissions"`
}

// App represents a satellite application connected to the portal.
type App struct {
	ID                string  `json:"id"`
	Name              string  `json:"name"`
	Description       *string `json:"description"`
	Icon              *string `json:"icon"`
	URL               *string `json:"url"`
	SchemaName        string  `json:"schemaName"`
	SchemaURL         *string `json:"schemaUrl"`
	Status            string  `json:"status"`
	LastHealthCheck   *string `json:"lastHealthCheck"`
	SortOrder         int32   `json:"sortOrder"`
	AvailableFeatures []any   `json:"availableFeatures"`
	CreatedAt         string  `json:"createdAt"`
}

// Pejabat represents an official assigned to a role.
type Pejabat struct {
	ID          string  `json:"id"`
	Nama        string  `json:"nama"`
	Email       string  `json:"email"`
	NIP         *string `json:"nip"`
	Jabatan     *string `json:"jabatan"`
	UnitKerja   *string `json:"unitKerja"`
	TipePejabat *string `json:"tipePejabat"`
	OrderIndex  int     `json:"orderIndex"`
}

// AuditLog represents an audit trail event.
type AuditLog struct {
	ID           string         `json:"id"`
	Action       string         `json:"action"`
	Target       string         `json:"target"`
	TargetSchema *string        `json:"targetSchema"`
	PerformedBy  string         `json:"performedBy"`
	BeforeState  map[string]any `json:"beforeState"`
	AfterState   map[string]any `json:"afterState"`
	IP           *string        `json:"ip"`
	Timestamp    string         `json:"timestamp"`
}

// AuditFilter holds filter options for querying audit logs.
type AuditFilter struct {
	Action       string
	TargetSchema string
	StartDate    string
	EndDate      string
	Search       string
	Limit        int
	Offset       int
}

// ActivityPoint represents aggregate activity on a specific date.
type ActivityPoint struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

// AppSummaryItem represents audit event counts per satellite app schema.
type AppSummaryItem struct {
	AppName string `json:"appName"`
	Count   int64  `json:"count"`
	Color   string `json:"color"`
}

// DashboardStats holds counts and totals for dashboard widgets.
type DashboardStats struct {
	TotalUsers  int64 `json:"totalUsers"`
	ActiveUsers int64 `json:"activeUsers"`
	TotalApps   int64 `json:"totalApps"`
	OnlineApps  int64 `json:"onlineApps"`
	TotalLogs   int64 `json:"totalLogs"`
	TodayLogs   int64 `json:"todayLogs"`
}

// LandingStats holds counter statistics displayed on the public landing page.
type LandingStats struct {
	TotalAppsCount    int64 `json:"totalAppsCount"`
	LayananMasyarakat int64 `json:"layananMasyarakat"`
	LayananPegawai    int64 `json:"layananPegawai"`
	TotalAdmin        int64 `json:"totalAdmin"`
	TotalPegawai      int64 `json:"totalPegawai"`
	TotalMasyarakat   int64 `json:"totalMasyarakat"`
}

// LandingData represents aggregated landing page data.
type LandingData struct {
	Stats LandingStats `json:"stats"`
	Apps  []App        `json:"apps"`
}

// SystemHealth represents a persisted snapshot of server resource utilization.
type SystemHealth struct {
	CPU        int    `json:"cpu"`
	RAM        int    `json:"ram"`
	Storage    int    `json:"storage"`
	Uptime     string `json:"uptime"`
	RecordedAt string `json:"recordedAt,omitempty"`
}

// TrustedDevice represents a remembered client device for 2FA bypass.
type TrustedDevice struct {
	ID         string  `json:"id"`
	UserID     string  `json:"userId"`
	DeviceName *string `json:"deviceName"`
	TokenHash  string  `json:"tokenHash"`
	LastUsedAt *string `json:"lastUsedAt"`
	ExpiresAt  *string `json:"expiresAt"`
	CreatedAt  string  `json:"createdAt"`
	IPAddress  *string `json:"ipAddress"`
}

// RealtimeMetrics represents live host metrics polled on-demand.
type RealtimeMetrics struct {
	CPU     RealtimeCPU     `json:"cpu"`
	RAM     RealtimeRAM     `json:"ram"`
	Storage RealtimeStorage `json:"storage"`
	Network RealtimeNetwork `json:"network"`
	Uptime  uint64          `json:"uptime"`
}

type RealtimeCPU struct {
	Load    float64 `json:"load"`
	AvgLoad float64 `json:"avgLoad"`
	Cores   int     `json:"cores"`
}

type RealtimeRAM struct {
	Total uint64 `json:"total"`
	Used  uint64 `json:"used"`
	Free  uint64 `json:"free"`
}

type RealtimeStorage struct {
	Total uint64 `json:"total"`
	Used  uint64 `json:"used"`
}

type RealtimeNetwork struct {
	RxSec float64 `json:"rxSec"`
	TxSec float64 `json:"txSec"`
}

// SystemMetricsSample is a helper for metrics collection.
type SystemMetricsSample struct {
	Metrics RealtimeMetrics
	At      time.Time
}

// Announcement represents an official public announcement or system update notice.
type Announcement struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	Tag         string  `json:"tag"`
	Description string  `json:"description"`
	IsImportant bool    `json:"isImportant"`
	IsActive    bool    `json:"isActive"`
	OrderIndex  int     `json:"orderIndex"`
	CreatedBy   *string `json:"createdBy,omitempty"`
	CreatedAt   string  `json:"createdAt"`
	UpdatedAt   string  `json:"updatedAt"`
}
