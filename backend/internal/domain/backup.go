package domain

// BackupFileItem represents a specific backup artifact file stored in R2.
type BackupFileItem struct {
	Key          string `json:"key"`
	FileName     string `json:"fileName"`
	Size         int64  `json:"size"`
	LastModified string `json:"lastModified"`
	DownloadURL  string `json:"downloadUrl"`
}

// BackupSchemaSummary describes the tables and row counts within a single backed-up schema.
type BackupSchemaSummary struct {
	SchemaName string   `json:"schemaName"`
	TableCount int      `json:"tableCount"`
	Tables     []string `json:"tables"`
	RowCount   int64    `json:"rowCount"`
	ByteSize   int64    `json:"byteSize"`
	FileName   string   `json:"fileName"`
}

// BackupManifest contains comprehensive metadata about a completed backup run.
type BackupManifest struct {
	ID             string                `json:"id"`
	Folder         string                `json:"folder"`
	Timestamp      string                `json:"timestamp"`
	TotalSchemas   int                   `json:"totalSchemas"`
	TotalTables    int                   `json:"totalTables"`
	TotalRows      int64                 `json:"totalRows"`
	TotalBytes     int64                 `json:"totalBytes"`
	DurationMs     int64                 `json:"durationMs"`
	Status         string                `json:"status"`
	TriggeredBy    string                `json:"triggeredBy"`
	Schemas        []BackupSchemaSummary `json:"schemas"`
	FullDumpFile   string                `json:"fullDumpFile"`
	ChecksumSHA256 string                `json:"checksumSha256,omitempty"`
}

// BackupSnapshot represents a timestamped backup directory in Cloudflare R2.
type BackupSnapshot struct {
	Folder       string           `json:"folder"`
	Timestamp    string           `json:"timestamp"`
	TotalSchemas int              `json:"totalSchemas"`
	TotalTables  int              `json:"totalTables"`
	TotalRows    int64            `json:"totalRows"`
	TotalBytes   int64            `json:"totalBytes"`
	TriggeredBy  string           `json:"triggeredBy"`
	Status       string           `json:"status"`
	Files        []BackupFileItem `json:"files"`
	Manifest     *BackupManifest  `json:"manifest,omitempty"`
}

// BackupSystemStatus represents the operational telemetry of the backup scheduler and bucket.
type BackupSystemStatus struct {
	SchedulerActive bool            `json:"schedulerActive"`
	ScheduleTime    string          `json:"scheduleTime"`
	NextRun         string          `json:"nextRun"`
	LastBackupAt    *string         `json:"lastBackupAt"`
	LastBackupState *string         `json:"lastBackupState"`
	TotalSnapshots  int             `json:"totalSnapshots"`
	TargetBucket    string          `json:"targetBucket"`
	IsRunning       bool            `json:"isRunning"`
	LatestManifest  *BackupManifest `json:"latestManifest,omitempty"`
}
