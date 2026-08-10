package database

// Models map to the exact JSON shapes the Next.js frontend expects.

type AppPermission struct {
	AppID    string `json:"appId"`
	Role     string `json:"role"`
	AppName  string `json:"appName"`
	Features []any  `json:"features"`
}

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

type ReportData struct {
	AppName string `json:"appName"`
	Count   int64  `json:"count"`
	Color   string `json:"color"`
}

type ActivityData struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

type LandingData struct {
	Stats LandingStats `json:"stats"`
	Apps  []App        `json:"apps"`
}
