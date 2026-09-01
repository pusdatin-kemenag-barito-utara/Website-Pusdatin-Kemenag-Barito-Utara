package services

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"path"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/jackc/pgx/v5/pgxpool"

	"pusdatin/backend/internal/config"
	"pusdatin/backend/internal/domain"
)

type BackupService struct {
	cfg            *config.Config
	pool           *pgxpool.Pool
	storageService *StorageService
	mu             sync.RWMutex
	isRunning      bool
	lastBackupAt   *time.Time
	lastState      string
	latestManifest *domain.BackupManifest
}

func NewBackupService(cfg *config.Config, pool *pgxpool.Pool, storageService *StorageService) *BackupService {
	return &BackupService{
		cfg:            cfg,
		pool:           pool,
		storageService: storageService,
		lastState:      "idle",
	}
}

// StartMidnightScheduler initializes the automatic daily midnight backup worker.
func (s *BackupService) StartMidnightScheduler(ctx context.Context) {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		loc = time.Local
	}

	go func() {
		for {
			now := time.Now().In(loc)
			nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, loc)
			sleepDuration := nextMidnight.Sub(now)

			log.Printf("⏳ [BACKUP SCHEDULER] Jadwal otomatis berikutnya: %s (%v lagi)", nextMidnight.Format("2006-01-02 15:04:05 MST"), sleepDuration.Round(time.Second))

			timer := time.NewTimer(sleepDuration)
			select {
			case <-ctx.Done():
				timer.Stop()
				return
			case <-timer.C:
				log.Println("🌙 [BACKUP SCHEDULER] Menjalankan pencadangan otomatis tengah malam (00:00 WIB)...")
				if _, err := s.RunBackup(context.Background(), "scheduler_midnight"); err != nil {
					log.Printf("❌ [BACKUP SCHEDULER ERROR] Gagal menjalankan backup otomatis: %v", err)
				}
			}
		}
	}()
}

// GetStatus returns the current backup scheduler and system status.
func (s *BackupService) GetStatus(ctx context.Context) (*domain.BackupSystemStatus, error) {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		loc = time.Local
	}
	now := time.Now().In(loc)
	nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, loc)

	s.mu.RLock()
	isRunning := s.isRunning
	lastState := s.lastState
	latestManifest := s.latestManifest
	var lastBackupAtStr *string
	if s.lastBackupAt != nil {
		t := s.lastBackupAt.Format(time.RFC3339)
		lastBackupAtStr = &t
	}
	s.mu.RUnlock()

	bucket := s.cfg.R2BucketBackup
	if bucket == "" {
		bucket = "database-back-up-daily"
	}

	// Count snapshots in R2
	totalSnapshots := 0
	if snapshots, err := s.ListSnapshots(ctx); err == nil {
		totalSnapshots = len(snapshots)
		if latestManifest == nil && len(snapshots) > 0 && snapshots[0].Manifest != nil {
			latestManifest = snapshots[0].Manifest
		}
	}

	return &domain.BackupSystemStatus{
		SchedulerActive: true,
		ScheduleTime:    "00:00:00 WIB (Setiap Hari)",
		NextRun:         nextMidnight.Format("2006-01-02 15:04:05 MST"),
		LastBackupAt:    lastBackupAtStr,
		LastBackupState: &lastState,
		TotalSnapshots:  totalSnapshots,
		TargetBucket:    bucket,
		IsRunning:       isRunning,
		LatestManifest:  latestManifest,
	}, nil
}

// RunBackup executes full dynamic database introspection, SQL generation, and Cloudflare R2 upload.
func (s *BackupService) RunBackup(ctx context.Context, triggeredBy string) (*domain.BackupManifest, error) {
	s.mu.Lock()
	if s.isRunning {
		s.mu.Unlock()
		return nil, fmt.Errorf("proses backup database sedang berlangsung")
	}
	s.isRunning = true
	s.lastState = "running"
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		s.isRunning = false
		s.mu.Unlock()
	}()

	startTime := time.Now()
	timestampStr := startTime.Format("2006-01-02_15-04-05")
	folderName := "backups/" + timestampStr

	log.Printf("🚀 [BACKUP START] Memulai pencadangan database penuh (Folder: %s, Trigger: %s)...", folderName, triggeredBy)

	// 1. Dynamic Schemas Discovery
	schemas, err := s.discoverSchemas(ctx)
	if err != nil {
		s.mu.Lock()
		s.lastState = "error"
		s.mu.Unlock()
		return nil, fmt.Errorf("discover schemas: %w", err)
	}

	bucket := s.cfg.R2BucketBackup
	if bucket == "" {
		bucket = "database-back-up-daily"
	}

	s3Client, err := s.storageService.S3Client(ctx)
	if err != nil {
		s.mu.Lock()
		s.lastState = "error"
		s.mu.Unlock()
		return nil, fmt.Errorf("init s3 client: %w", err)
	}

	var totalTables int
	var totalRows int64
	var totalBytes int64
	var schemaSummaries []domain.BackupSchemaSummary

	var fullDumpBuf bytes.Buffer
	fullDumpBuf.WriteString("-- =============================================================================\n")
	fullDumpBuf.WriteString("-- PUSDATIN KEMENAG BARITO UTARA - FULL DATABASE BACKUP DUMP\n")
	fullDumpBuf.WriteString(fmt.Sprintf("-- Timestamp: %s (UTC: %s)\n", startTime.Format("2006-01-02 15:04:05 MST"), startTime.UTC().Format(time.RFC3339)))
	fullDumpBuf.WriteString(fmt.Sprintf("-- Target R2 Bucket: %s\n", bucket))
	fullDumpBuf.WriteString(fmt.Sprintf("-- Trigger: %s\n", triggeredBy))
	fullDumpBuf.WriteString("-- =============================================================================\n\n")
	fullDumpBuf.WriteString("SET statement_timeout = 0;\nSET lock_timeout = 0;\nSET client_encoding = 'UTF8';\nSET standard_conforming_strings = on;\n\n")

	// 2. Dump Each Discovered Schema Independently
	for _, schemaName := range schemas {
		schemaDump, summary, err := s.dumpSchema(ctx, schemaName)
		if err != nil {
			log.Printf("⚠️ [BACKUP WARN] Gagal dump skema %s: %v", schemaName, err)
			continue
		}

		totalTables += summary.TableCount
		totalRows += summary.RowCount
		totalBytes += int64(len(schemaDump))
		schemaSummaries = append(schemaSummaries, *summary)

		// Upload individual schema SQL file
		schemaFileName := summary.FileName
		schemaKey := folderName + "/" + schemaFileName

		if _, err := s3Client.PutObject(ctx, &s3.PutObjectInput{
			Bucket:        aws.String(bucket),
			Key:           aws.String(schemaKey),
			Body:          bytes.NewReader(schemaDump),
			ContentLength: aws.Int64(int64(len(schemaDump))),
			ContentType:   aws.String("application/sql; charset=utf-8"),
		}); err != nil {
			log.Printf("❌ [BACKUP ERROR] Gagal upload %s ke R2: %v", schemaKey, err)
		} else {
			log.Printf("✅ [BACKUP UPLOAD] %s (%d tables, %d rows, %s)", schemaKey, summary.TableCount, summary.RowCount, formatBytes(int64(len(schemaDump))))
		}

		fullDumpBuf.WriteString("\n-- -----------------------------------------------------------------------------\n")
		fullDumpBuf.WriteString(fmt.Sprintf("-- SCHEMA: %s\n", schemaName))
		fullDumpBuf.WriteString("-- -----------------------------------------------------------------------------\n\n")
		fullDumpBuf.Write(schemaDump)
		fullDumpBuf.WriteString("\n")
	}

	// 3. Upload Consolidated Full Database Dump
	fullDumpBytes := fullDumpBuf.Bytes()
	fullDumpKey := folderName + "/00_full_database_dump.sql"

	hasher := sha256.New()
	hasher.Write(fullDumpBytes)
	checksumHex := hex.EncodeToString(hasher.Sum(nil))

	if _, err := s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(bucket),
		Key:           aws.String(fullDumpKey),
		Body:          bytes.NewReader(fullDumpBytes),
		ContentLength: aws.Int64(int64(len(fullDumpBytes))),
		ContentType:   aws.String("application/sql; charset=utf-8"),
	}); err != nil {
		log.Printf("❌ [BACKUP ERROR] Gagal upload full dump %s ke R2: %v", fullDumpKey, err)
	} else {
		log.Printf("✅ [BACKUP FULL DUMP] %s (%s, SHA256: %s...)", fullDumpKey, formatBytes(int64(len(fullDumpBytes))), checksumHex[:12])
	}

	durationMs := time.Since(startTime).Milliseconds()

	// 4. Generate & Upload Manifest
	manifest := &domain.BackupManifest{
		ID:             timestampStr,
		Folder:         folderName,
		Timestamp:      startTime.Format(time.RFC3339),
		TotalSchemas:   len(schemaSummaries),
		TotalTables:    totalTables,
		TotalRows:      totalRows,
		TotalBytes:     int64(len(fullDumpBytes)),
		DurationMs:     durationMs,
		Status:         "success",
		TriggeredBy:    triggeredBy,
		Schemas:        schemaSummaries,
		FullDumpFile:   "00_full_database_dump.sql",
		ChecksumSHA256: checksumHex,
	}

	manifestBytes, _ := json.MarshalIndent(manifest, "", "  ")
	manifestKey := folderName + "/manifest.json"

	if _, err := s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(bucket),
		Key:           aws.String(manifestKey),
		Body:          bytes.NewReader(manifestBytes),
		ContentLength: aws.Int64(int64(len(manifestBytes))),
		ContentType:   aws.String("application/json; charset=utf-8"),
	}); err != nil {
		log.Printf("❌ [BACKUP ERROR] Gagal upload manifest %s ke R2: %v", manifestKey, err)
	} else {
		log.Printf("✅ [BACKUP MANIFEST] %s berhasil disimpan", manifestKey)
	}

	// Update service state
	s.mu.Lock()
	s.lastBackupAt = &startTime
	s.lastState = "success"
	s.latestManifest = manifest
	s.mu.Unlock()

	log.Printf("🎉 [BACKUP COMPLETED] Sukses mencadangkan %d skema, %d tabel, %d baris dalam %dms", len(schemaSummaries), totalTables, totalRows, durationMs)

	// Automatically prune old snapshots older than 3 days from Cloudflare R2
	go func() {
		pruneCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if deleted, err := s.PruneOldBackups(pruneCtx, 3); err == nil && deleted > 0 {
			log.Printf("🧹 [BACKUP RETENTION] Pembersihan otomatis selesai: %d snapshot usang (> 3 hari) telah dihapus dari Cloudflare R2", deleted)
		}
	}()

	return manifest, nil
}

// discoverSchemas finds all business & data schemas dynamically.
func (s *BackupService) discoverSchemas(ctx context.Context) ([]string, error) {
	query := `
		SELECT schema_name 
		FROM information_schema.schemata 
		WHERE schema_name NOT IN (
			'pg_toast', 'pg_temp_1', 'information_schema', 'pg_catalog', 
			'pgbouncer', '_realtime', 'graphql', 'graphql_public', 'net', 
			'vault', 'supabase_functions', 'supabase_migrations'
		)
		AND schema_name NOT LIKE 'pg_temp_%'
		AND schema_name NOT LIKE 'pg_toast_temp_%'
		ORDER BY 
			CASE 
				WHEN schema_name = 'kemenag_pusdatin' THEN 1 
				WHEN schema_name = 'public' THEN 2 
				ELSE 3 
			END, 
			schema_name ASC;`

	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var schemas []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err == nil && name != "" {
			schemas = append(schemas, name)
		}
	}
	return schemas, rows.Err()
}

// dumpSchema generates a clean SQL DDL + INSERT statements for a specific schema.
func (s *BackupService) dumpSchema(ctx context.Context, schemaName string) ([]byte, *domain.BackupSchemaSummary, error) {
	var buf bytes.Buffer
	buf.WriteString(fmt.Sprintf("-- Schema Creation\nCREATE SCHEMA IF NOT EXISTS %s;\n\n", quoteIdent(schemaName)))

	// 1. Discover all base tables in this schema
	tableQuery := `
		SELECT table_name 
		FROM information_schema.tables 
		WHERE table_schema = $1 AND table_type = 'BASE TABLE'
		ORDER BY table_name ASC;`

	rows, err := s.pool.Query(ctx, tableQuery, schemaName)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var tableNames []string
	for rows.Next() {
		var tName string
		if err := rows.Scan(&tName); err == nil && tName != "" {
			tableNames = append(tableNames, tName)
		}
	}
	rows.Close()

	var totalRows int64

	// 2. Dump each table structure and data
	for _, tableName := range tableNames {
		// Dump Table DDL
		ddl, colNames, err := s.generateTableDDL(ctx, schemaName, tableName)
		if err != nil {
			log.Printf("⚠️ [BACKUP DDL WARN] %s.%s: %v", schemaName, tableName, err)
			continue
		}
		buf.WriteString(ddl)
		buf.WriteString("\n")

		// Dump Table Data
		rowCount, dataSQL, err := s.generateTableData(ctx, schemaName, tableName, colNames)
		if err != nil {
			log.Printf("⚠️ [BACKUP DATA WARN] %s.%s: %v", schemaName, tableName, err)
		} else {
			totalRows += rowCount
			if dataSQL != "" {
				buf.WriteString(dataSQL)
				buf.WriteString("\n")
			}
		}
	}

	summary := &domain.BackupSchemaSummary{
		SchemaName: schemaName,
		TableCount: len(tableNames),
		Tables:     tableNames,
		RowCount:   totalRows,
		ByteSize:   int64(buf.Len()),
		FileName:   sanitizeFileName(schemaName) + ".sql",
	}

	return buf.Bytes(), summary, nil
}

// generateTableDDL builds CREATE TABLE statement with columns & primary keys.
func (s *BackupService) generateTableDDL(ctx context.Context, schemaName, tableName string) (string, []string, error) {
	colQuery := `
		SELECT column_name, data_type, udt_name, is_nullable, column_default
		FROM information_schema.columns
		WHERE table_schema = $1 AND table_name = $2
		ORDER BY ordinal_position ASC;`

	rows, err := s.pool.Query(ctx, colQuery, schemaName, tableName)
	if err != nil {
		return "", nil, err
	}
	defer rows.Close()

	var colDefs []string
	var colNames []string

	for rows.Next() {
		var colName, dataType, udtName, isNullable string
		var colDefault *string
		if err := rows.Scan(&colName, &dataType, &udtName, &isNullable, &colDefault); err != nil {
			continue
		}
		colNames = append(colNames, colName)

		typeSpec := dataType
		if dataType == "USER-DEFINED" || dataType == "ARRAY" {
			typeSpec = udtName
		}

		def := fmt.Sprintf("    %s %s", quoteIdent(colName), typeSpec)
		if isNullable == "NO" {
			def += " NOT NULL"
		}
		if colDefault != nil && *colDefault != "" {
			def += fmt.Sprintf(" DEFAULT %s", *colDefault)
		}
		colDefs = append(colDefs, def)
	}
	rows.Close()

	// Discover Primary Key
	pkQuery := `
		SELECT kcu.column_name
		FROM information_schema.table_constraints tc
		JOIN information_schema.key_column_usage kcu
		  ON tc.constraint_name = kcu.constraint_name
		 AND tc.table_schema = kcu.table_schema
		WHERE tc.constraint_type = 'PRIMARY KEY'
		  AND tc.table_schema = $1
		  AND tc.table_name = $2
		ORDER BY kcu.ordinal_position;`

	pkRows, err := s.pool.Query(ctx, pkQuery, schemaName, tableName)
	if err == nil {
		var pkCols []string
		for pkRows.Next() {
			var col string
			if err := pkRows.Scan(&col); err == nil && col != "" {
				pkCols = append(pkCols, quoteIdent(col))
			}
		}
		pkRows.Close()
		if len(pkCols) > 0 {
			colDefs = append(colDefs, fmt.Sprintf("    PRIMARY KEY (%s)", strings.Join(pkCols, ", ")))
		}
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("-- Table Structure: %s.%s\n", quoteIdent(schemaName), quoteIdent(tableName)))
	sb.WriteString(fmt.Sprintf("CREATE TABLE IF NOT EXISTS %s.%s (\n", quoteIdent(schemaName), quoteIdent(tableName)))
	sb.WriteString(strings.Join(colDefs, ",\n"))
	sb.WriteString("\n);\n")

	return sb.String(), colNames, nil
}

// generateTableData serializes rows into INSERT statements with batching.
func (s *BackupService) generateTableData(ctx context.Context, schemaName, tableName string, colNames []string) (int64, string, error) {
	if len(colNames) == 0 {
		return 0, "", nil
	}

	quotedCols := make([]string, len(colNames))
	for i, c := range colNames {
		quotedCols[i] = quoteIdent(c)
	}
	colsList := strings.Join(quotedCols, ", ")

	query := fmt.Sprintf("SELECT %s FROM %s.%s", colsList, quoteIdent(schemaName), quoteIdent(tableName))
	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return 0, "", err
	}
	defer rows.Close()

	var count int64
	var sb strings.Builder

	for rows.Next() {
		vals, err := rows.Values()
		if err != nil {
			continue
		}

		formattedVals := make([]string, len(vals))
		for i, v := range vals {
			formattedVals[i] = formatSQLValue(v)
		}

		sb.WriteString(fmt.Sprintf("INSERT INTO %s.%s (%s) VALUES (%s) ON CONFLICT DO NOTHING;\n",
			quoteIdent(schemaName), quoteIdent(tableName), colsList, strings.Join(formattedVals, ", ")))
		count++
	}

	return count, sb.String(), rows.Err()
}

// ListSnapshots returns all backup folders stored in Cloudflare R2 bucket.
func (s *BackupService) ListSnapshots(ctx context.Context) ([]domain.BackupSnapshot, error) {
	bucket := s.cfg.R2BucketBackup
	if bucket == "" {
		bucket = "database-back-up-daily"
	}

	s3Client, err := s.storageService.S3Client(ctx)
	if err != nil {
		return nil, err
	}

	out, err := s3Client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket: aws.String(bucket),
		Prefix: aws.String("backups/"),
	})
	if err != nil {
		return nil, err
	}

	folderMap := make(map[string][]domain.BackupFileItem)
	for _, obj := range out.Contents {
		key := *obj.Key
		parts := strings.Split(key, "/")
		if len(parts) < 3 {
			continue
		}
		folder := parts[0] + "/" + parts[1]
		fileName := parts[2]

		var lastMod string
		if obj.LastModified != nil {
			lastMod = obj.LastModified.Format(time.RFC3339)
		}

		item := domain.BackupFileItem{
			Key:          key,
			FileName:     fileName,
			Size:         *obj.Size,
			LastModified: lastMod,
			DownloadURL:  "/api/backup/download?key=" + key,
		}
		folderMap[folder] = append(folderMap[folder], item)
	}

	var snapshots []domain.BackupSnapshot
	for folder, files := range folderMap {
		var totalSize int64
		var manifest *domain.BackupManifest
		ts := strings.TrimPrefix(folder, "backups/")

		for _, f := range files {
			totalSize += f.Size
			if f.FileName == "manifest.json" {
				// Fetch manifest from R2
				if mData, err := s.fetchObjectBytes(ctx, s3Client, bucket, f.Key); err == nil {
					var m domain.BackupManifest
					if json.Unmarshal(mData, &m) == nil {
						manifest = &m
					}
				}
			}
		}

		snap := domain.BackupSnapshot{
			Folder:       folder,
			Timestamp:    ts,
			TotalBytes:   totalSize,
			TotalSchemas: len(files) - 2, // exclude full dump & manifest
			TriggeredBy:  "scheduler_midnight",
			Status:       "success",
			Files:        files,
			Manifest:     manifest,
		}
		if manifest != nil {
			snap.TotalSchemas = manifest.TotalSchemas
			snap.TotalTables = manifest.TotalTables
			snap.TotalRows = manifest.TotalRows
			snap.TriggeredBy = manifest.TriggeredBy
			snap.Status = manifest.Status
		}
		snapshots = append(snapshots, snap)
	}

	// Sort newest first
	for i := 0; i < len(snapshots)-1; i++ {
		for j := i + 1; j < len(snapshots); j++ {
			if snapshots[i].Timestamp < snapshots[j].Timestamp {
				snapshots[i], snapshots[j] = snapshots[j], snapshots[i]
			}
		}
	}

	return snapshots, nil
}

// DownloadFile streams a specific backup file from Cloudflare R2.
func (s *BackupService) DownloadFile(ctx context.Context, key string) ([]byte, string, string, error) {
	bucket := s.cfg.R2BucketBackup
	if bucket == "" {
		bucket = "database-back-up-daily"
	}

	s3Client, err := s.storageService.S3Client(ctx)
	if err != nil {
		return nil, "", "", err
	}

	data, err := s.fetchObjectBytes(ctx, s3Client, bucket, key)
	if err != nil {
		return nil, "", "", err
	}

	fileName := path.Base(key)
	contentType := "application/octet-stream"
	if strings.HasSuffix(fileName, ".sql") {
		contentType = "application/sql; charset=utf-8"
	} else if strings.HasSuffix(fileName, ".json") {
		contentType = "application/json; charset=utf-8"
	}

	return data, fileName, contentType, nil
}

// DeleteSnapshot removes an entire backup folder and all its files from Cloudflare R2.
func (s *BackupService) DeleteSnapshot(ctx context.Context, folder string) error {
	folder = strings.TrimPrefix(folder, "/")
	folder = strings.TrimSuffix(folder, "/")
	if !strings.HasPrefix(folder, "backups/") {
		return fmt.Errorf("invalid backup folder path")
	}

	bucket := s.cfg.R2BucketBackup
	if bucket == "" {
		bucket = "database-back-up-daily"
	}

	s3Client, err := s.storageService.S3Client(ctx)
	if err != nil {
		return err
	}

	prefix := folder + "/"
	out, err := s3Client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket: aws.String(bucket),
		Prefix: aws.String(prefix),
	})
	if err != nil {
		return err
	}

	for _, obj := range out.Contents {
		_, _ = s3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
			Bucket: aws.String(bucket),
			Key:    obj.Key,
		})
	}

	log.Printf("🗑️ [BACKUP DELETE] Sukses menghapus snapshot %s (%d file) dari Cloudflare R2", folder, len(out.Contents))
	return nil
}

// PruneOldBackups automatically scans Cloudflare R2 and deletes snapshots older than retentionDays.
func (s *BackupService) PruneOldBackups(ctx context.Context, retentionDays int) (int, error) {
	if retentionDays < 1 {
		retentionDays = 3
	}

	snapshots, err := s.ListSnapshots(ctx)
	if err != nil {
		return 0, err
	}

	cutoffTime := time.Now().AddDate(0, 0, -retentionDays)
	deletedCount := 0

	for _, snap := range snapshots {
		var snapTime time.Time
		if t, err := time.Parse("2006-01-02_15-04-05", snap.Timestamp); err == nil {
			snapTime = t
		} else if snap.Manifest != nil && snap.Manifest.Timestamp != "" {
			if t, err := time.Parse(time.RFC3339, snap.Manifest.Timestamp); err == nil {
				snapTime = t
			}
		}

		if !snapTime.IsZero() && snapTime.Before(cutoffTime) {
			log.Printf("⏳ [BACKUP RETENTION] Menghapus snapshot lama (> %d hari): %s (%s)", retentionDays, snap.Folder, snapTime.Format("2006-01-02 15:04:05"))
			if err := s.DeleteSnapshot(ctx, snap.Folder); err == nil {
				deletedCount++
			}
		}
	}

	return deletedCount, nil
}

func (s *BackupService) fetchObjectBytes(ctx context.Context, client *s3.Client, bucket, key string) ([]byte, error) {
	resp, err := client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

func quoteIdent(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}

func sanitizeFileName(name string) string {
	name = strings.ReplaceAll(name, "/", "_")
	name = strings.ReplaceAll(name, "\\", "_")
	return name
}

func formatSQLValue(v any) string {
	if v == nil {
		return "NULL"
	}
	switch val := v.(type) {
	case bool:
		if val {
			return "TRUE"
		}
		return "FALSE"
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64, float32, float64:
		return fmt.Sprintf("%v", val)
	case time.Time:
		return fmt.Sprintf("'%s'", val.Format(time.RFC3339Nano))
	case []byte:
		// Format as hex or text
		return fmt.Sprintf("'%s'", strings.ReplaceAll(string(val), "'", "''"))
	default:
		str := fmt.Sprintf("%v", val)
		return fmt.Sprintf("'%s'", strings.ReplaceAll(str, "'", "''"))
	}
}

func formatBytes(b int64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.2f %cB", float64(b)/float64(div), "KMGTPE"[exp])
}
