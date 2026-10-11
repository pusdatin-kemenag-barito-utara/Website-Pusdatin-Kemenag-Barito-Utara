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
	"net/url"
	"path"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"pusdatin/backend/internal/config"
	"pusdatin/backend/internal/database"
	"pusdatin/backend/internal/domain"
)

type BackupService struct {
	cfg            *config.Config
	store          *database.Store
	storageService *StorageService
	mu             sync.RWMutex
	isRunning      bool
	lastBackupAt   *time.Time
	lastState      string
	latestManifest *domain.BackupManifest
}

func NewBackupService(cfg *config.Config, store *database.Store, storageService *StorageService) *BackupService {
	return &BackupService{
		cfg:            cfg,
		store:          store,
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

	totalSnapshots := 0
	snapshots, err := s.ListSnapshots(ctx)
	if err == nil {
		totalSnapshots = len(snapshots)
	}

	return &domain.BackupSystemStatus{
		SchedulerActive: true,
		ScheduleTime:    "00:00 WIB (Asia/Jakarta)",
		NextRun:         nextMidnight.Format(time.RFC3339),
		LastBackupAt:    lastBackupAtStr,
		LastBackupState: &lastState,
		TotalSnapshots:  totalSnapshots,
		TargetBucket:    bucket,
		IsRunning:       isRunning,
		LatestManifest:  latestManifest,
	}, nil
}

// RunBackup executes full database backup of all PocketBase collections to Cloudflare R2.
func (s *BackupService) RunBackup(ctx context.Context, triggeredBy string) (*domain.BackupManifest, error) {
	s.mu.Lock()
	if s.isRunning {
		s.mu.Unlock()
		return nil, fmt.Errorf("proses pencadangan sedang berjalan")
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

	log.Printf("🚀 [BACKUP START] Memulai pencadangan PocketBase penuh (Folder: %s, Trigger: %s)...", folderName, triggeredBy)

	bucket := s.cfg.R2BucketBackup

	s3Client, err := s.storageService.S3Client(ctx)
	if err != nil {
		s.mu.Lock()
		s.lastState = "error"
		s.mu.Unlock()
		return nil, fmt.Errorf("init s3 client: %w", err)
	}

	collections := []string{
		"announcements",
		"audit_logs",
		"login_attempts",
		"profiles",
		"ptsp_activity_logs",
		"satellite_apps",
		"system_metrics",
		"trusted_devices",
	}

	var totalTables int
	var totalRows int64
	var totalBytes int64
	var schemaSummaries []domain.BackupSchemaSummary

	var fullDumpBuf bytes.Buffer
	fullDumpBuf.WriteString("-- =============================================================================\n")
	fullDumpBuf.WriteString("-- PUSDATIN KEMENAG BARITO UTARA - POCKETBASE DATABASE BACKUP DUMP\n")
	fullDumpBuf.WriteString(fmt.Sprintf("-- Timestamp: %s (UTC: %s)\n", startTime.Format("2006-01-02 15:04:05 MST"), startTime.UTC().Format(time.RFC3339)))
	fullDumpBuf.WriteString(fmt.Sprintf("-- Target R2 Bucket: %s\n", bucket))
	fullDumpBuf.WriteString(fmt.Sprintf("-- Trigger: %s\n", triggeredBy))
	fullDumpBuf.WriteString("-- =============================================================================\n\n")

	for _, colName := range collections {
		colDump, rowCount, err := s.dumpCollection(ctx, colName)
		if err != nil {
			log.Printf("⚠️ [BACKUP WARN] Gagal dump koleksi %s: %v", colName, err)
			continue
		}

		totalTables++
		totalRows += rowCount
		totalBytes += int64(len(colDump))

		schemaSummaries = append(schemaSummaries, domain.BackupSchemaSummary{
			SchemaName: colName,
			TableCount: 1,
			Tables:     []string{colName},
			RowCount:   rowCount,
			ByteSize:   int64(len(colDump)),
			FileName:   colName + ".sql",
		})

		colKey := folderName + "/" + colName + ".sql"
		if _, err := s3Client.PutObject(ctx, &s3.PutObjectInput{
			Bucket:        aws.String(bucket),
			Key:           aws.String(colKey),
			Body:          bytes.NewReader(colDump),
			ContentLength: aws.Int64(int64(len(colDump))),
			ContentType:   aws.String("application/sql; charset=utf-8"),
		}); err != nil {
			log.Printf("❌ [BACKUP ERROR] Gagal upload %s ke R2: %v", colKey, err)
		} else {
			log.Printf("✅ [BACKUP UPLOAD] %s (%d rows, %s)", colKey, rowCount, formatBytes(int64(len(colDump))))
		}

		fullDumpBuf.WriteString(fmt.Sprintf("\n-- COLLECTION: %s (%d rows)\n", colName, rowCount))
		fullDumpBuf.Write(colDump)
		fullDumpBuf.WriteString("\n")
	}

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
	}

	durationMs := time.Since(startTime).Milliseconds()

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
	}

	s.mu.Lock()
	s.lastBackupAt = &startTime
	s.lastState = "success"
	s.latestManifest = manifest
	s.mu.Unlock()

	log.Printf("🎉 [BACKUP COMPLETED] Sukses mencadangkan %d koleksi, %d tabel, %d baris dalam %dms", len(schemaSummaries), totalTables, totalRows, durationMs)

	go func() {
		pruneCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		if deleted, err := s.PruneOldBackups(pruneCtx, 3); err == nil && deleted > 0 {
			log.Printf("🧹 [BACKUP RETENTION] Pembersihan otomatis: %d snapshot lama dihapus dari R2", deleted)
		}
	}()

	return manifest, nil
}

func (s *BackupService) dumpCollection(ctx context.Context, colName string) ([]byte, int64, error) {
	params := url.Values{}
	params.Set("perPage", "1000")
	params.Set("page", "1")

	var records []map[string]any
	total, err := s.store.ListRecords(ctx, colName, params, &records)
	if err != nil {
		return nil, 0, err
	}

	var buf bytes.Buffer
	buf.WriteString(fmt.Sprintf("-- Table structure and data for collection `%s`\n", colName))
	buf.WriteString(fmt.Sprintf("CREATE TABLE IF NOT EXISTS `%s` (\n  `id` TEXT PRIMARY KEY\n);\n\n", colName))

	for _, rec := range records {
		cols := []string{}
		vals := []string{}
		for k, v := range rec {
			cols = append(cols, fmt.Sprintf("`%s`", k))
			switch val := v.(type) {
			case nil:
				vals = append(vals, "NULL")
			case string:
				escaped := strings.ReplaceAll(val, "'", "''")
				vals = append(vals, fmt.Sprintf("'%s'", escaped))
			case map[string]any, []any:
				b, _ := json.Marshal(val)
				escaped := strings.ReplaceAll(string(b), "'", "''")
				vals = append(vals, fmt.Sprintf("'%s'", escaped))
			default:
				vals = append(vals, fmt.Sprintf("%v", val))
			}
		}
		if len(cols) > 0 {
			buf.WriteString(fmt.Sprintf("INSERT INTO `%s` (%s) VALUES (%s);\n", colName, strings.Join(cols, ", "), strings.Join(vals, ", ")))
		}
	}

	return buf.Bytes(), total, nil
}

// ListSnapshots returns all backup manifests stored in Cloudflare R2.
func (s *BackupService) ListSnapshots(ctx context.Context) ([]domain.BackupSnapshot, error) {
	bucket := s.cfg.R2BucketBackup

	s3Client, err := s.storageService.S3Client(ctx)
	if err != nil {
		return nil, err
	}

	paginator := s3.NewListObjectsV2Paginator(s3Client, &s3.ListObjectsV2Input{
		Bucket:    aws.String(bucket),
		Prefix:    aws.String("backups/"),
		Delimiter: aws.String("/"),
	})

	var snapshots []domain.BackupSnapshot
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return nil, err
		}

		for _, cp := range page.CommonPrefixes {
			folder := strings.TrimSuffix(aws.ToString(cp.Prefix), "/")
			manifestKey := folder + "/manifest.json"

			resp, err := s3Client.GetObject(ctx, &s3.GetObjectInput{
				Bucket: aws.String(bucket),
				Key:    aws.String(manifestKey),
			})
			if err != nil {
				continue
			}

			data, err := io.ReadAll(resp.Body)
			resp.Body.Close()
			if err != nil {
				continue
			}

			var mf domain.BackupManifest
			if err := json.Unmarshal(data, &mf); err != nil {
				continue
			}

			files := []domain.BackupFileItem{}
			for _, sch := range mf.Schemas {
				files = append(files, domain.BackupFileItem{
					Key:      folder + "/" + sch.FileName,
					FileName: sch.FileName,
					Size:     sch.ByteSize,
				})
			}
			if mf.FullDumpFile != "" {
				files = append(files, domain.BackupFileItem{
					Key:      folder + "/" + mf.FullDumpFile,
					FileName: mf.FullDumpFile,
					Size:     mf.TotalBytes,
				})
			}
			files = append(files, domain.BackupFileItem{
				Key:      manifestKey,
				FileName: "manifest.json",
				Size:     int64(len(data)),
			})

			snapshots = append(snapshots, domain.BackupSnapshot{
				Folder:       folder,
				Timestamp:    mf.Timestamp,
				TotalSchemas: mf.TotalSchemas,
				TotalTables:  mf.TotalTables,
				TotalRows:    mf.TotalRows,
				TotalBytes:   mf.TotalBytes,
				TriggeredBy:  mf.TriggeredBy,
				Status:       mf.Status,
				Files:        files,
				Manifest:     &mf,
			})
		}
	}

	return snapshots, nil
}

func (s *BackupService) DownloadFile(ctx context.Context, key string) ([]byte, string, string, error) {
	bucket := s.cfg.R2BucketBackup

	s3Client, err := s.storageService.S3Client(ctx)
	if err != nil {
		return nil, "", "", err
	}

	resp, err := s3Client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, "", "", err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", "", err
	}

	fileName := path.Base(key)
	contentType := aws.ToString(resp.ContentType)
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	return data, fileName, contentType, nil
}

func (s *BackupService) DeleteSnapshot(ctx context.Context, folder string) error {
	bucket := s.cfg.R2BucketBackup

	s3Client, err := s.storageService.S3Client(ctx)
	if err != nil {
		return err
	}

	prefix := strings.TrimSuffix(folder, "/") + "/"
	paginator := s3.NewListObjectsV2Paginator(s3Client, &s3.ListObjectsV2Input{
		Bucket: aws.String(bucket),
		Prefix: aws.String(prefix),
	})

	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return err
		}

		for _, obj := range page.Contents {
			_, _ = s3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
				Bucket: aws.String(bucket),
				Key:    obj.Key,
			})
		}
	}

	return nil
}

func (s *BackupService) PruneOldBackups(ctx context.Context, retentionDays int) (int, error) {
	snapshots, err := s.ListSnapshots(ctx)
	if err != nil {
		return 0, err
	}

	cutoff := time.Now().AddDate(0, 0, -retentionDays)
	deleted := 0

	for _, snap := range snapshots {
		t, err := time.Parse(time.RFC3339, snap.Timestamp)
		if err != nil {
			continue
		}

		if t.Before(cutoff) {
			if err := s.DeleteSnapshot(ctx, snap.Folder); err == nil {
				deleted++
			}
		}
	}

	return deleted, nil
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
	return fmt.Sprintf("%.1f %cB", float64(b)/float64(div), "KMGTPE"[exp])
}
