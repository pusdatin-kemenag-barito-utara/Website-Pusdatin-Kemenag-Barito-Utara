package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"pusdatin/backend/internal/config"
	"pusdatin/backend/internal/domain"
)

type StorageService struct {
	cfg *config.Config
}

func NewStorageService(cfg *config.Config) *StorageService {
	return &StorageService{cfg: cfg}
}

func (s *StorageService) S3Client(ctx context.Context) (*s3.Client, error) {
	cfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion("auto"),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			s.cfg.R2AccessKeyID, s.cfg.R2SecretAccessKey, "",
		)),
	)
	if err != nil {
		return nil, err
	}
	return s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(s.cfg.R2EndpointURL)
		o.UsePathStyle = true
		o.RequestChecksumCalculation = aws.RequestChecksumCalculationWhenRequired
		o.ResponseChecksumValidation = aws.ResponseChecksumValidationWhenRequired
	}), nil
}

func (s *StorageService) UploadAppLogo(ctx context.Context, originalFilename, contentType string, data []byte) (string, error) {
	uniqueSuffix := fmt.Sprintf("%d-%d", time.Now().UnixMilli(), time.Now().UnixNano()%1_000_000_000)
	ext := path.Ext(originalFilename)
	if ext == "" {
		ext = ".png"
	}
	filename := "app-logo-" + uniqueSuffix + ext
	objectKey := "apps/" + filename

	bucket := s.cfg.R2BucketPusdatin
	if bucket == "" {
		bucket = "data-pusdatin"
	}

	if contentType == "" || contentType == "application/octet-stream" {
		switch strings.ToLower(ext) {
		case ".svg":
			contentType = "image/svg+xml"
		case ".png":
			contentType = "image/png"
		case ".jpg", ".jpeg":
			contentType = "image/jpeg"
		case ".webp":
			contentType = "image/webp"
		}
	}

	client, err := s.S3Client(ctx)
	if err != nil {
		return "", fmt.Errorf("s3 client init: %w", err)
	}

	contentLength := int64(len(data))
	if _, err := client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(bucket),
		Key:           aws.String(objectKey),
		Body:          bytes.NewReader(data),
		ContentLength: aws.Int64(contentLength),
		ContentType:   aws.String(contentType),
	}); err != nil {
		return "", fmt.Errorf("s3 put object: %w", err)
	}

	return "/uploads/apps/" + filename, nil
}

type StorageProxyResult struct {
	LocalPath     string
	Body          io.ReadCloser
	ContentLength *int64
	ContentType   string
	IsLocal       bool
}

func (s *StorageService) ResolveUploadObject(ctx context.Context, filename string) (*StorageProxyResult, error) {
	cleanName := filepath.Base(filename)
	if cleanName == "" || cleanName == "." || cleanName == "/" {
		return nil, domain.ErrNotFound
	}

	// 1. Check local disk fallback
	localPaths := []string{
		filepath.Join("public", "uploads", "apps", cleanName),
		filepath.Join("uploads", "apps", cleanName),
		filepath.Join("..", "frontend", "public", "uploads", "apps", cleanName),
		filepath.Join("..", "uploads", "apps", cleanName),
	}
	for _, lp := range localPaths {
		if _, err := os.Stat(lp); err == nil {
			return &StorageProxyResult{LocalPath: lp, IsLocal: true}, nil
		}
	}

	// 2. Query R2 cloud storage across candidate keys & buckets
	client, err := s.S3Client(ctx)
	if err != nil {
		return nil, fmt.Errorf("s3 client: %w", err)
	}

	candidateBuckets := []string{
		s.cfg.R2BucketPusdatin,
		"data-arsip",
		"data-inklusi",
		"data-ppid",
		"data-ptsp",
		"data-surat",
	}

	candidateKeys := []string{
		"apps/" + cleanName,
		cleanName,
		"uploads/apps/" + cleanName,
		"uploads/" + cleanName,
	}

	var out *s3.GetObjectOutput
	for _, bucket := range candidateBuckets {
		if bucket == "" {
			continue
		}
		for _, objectKey := range candidateKeys {
			res, err := client.GetObject(ctx, &s3.GetObjectInput{
				Bucket: aws.String(bucket),
				Key:    aws.String(objectKey),
			})
			if err == nil {
				out = res
				break
			}
		}
		if out != nil {
			break
		}
	}

	if out == nil {
		return nil, domain.ErrNotFound
	}

	ct := "application/octet-stream"
	if out.ContentType != nil && *out.ContentType != "" && *out.ContentType != "application/octet-stream" {
		ct = *out.ContentType
	} else {
		ext := strings.ToLower(path.Ext(cleanName))
		switch ext {
		case ".svg":
			ct = "image/svg+xml"
		case ".png":
			ct = "image/png"
		case ".jpg", ".jpeg":
			ct = "image/jpeg"
		case ".webp":
			ct = "image/webp"
		case ".ico":
			ct = "image/x-icon"
		}
	}

	return &StorageProxyResult{
		Body:          out.Body,
		ContentLength: out.ContentLength,
		ContentType:   ct,
		IsLocal:       false,
	}, nil
}

func (s *StorageService) GetR2Buckets(ctx context.Context) ([]map[string]any, error) {
	if s.cfg.CloudflareAccountID == "" || s.cfg.CloudflareAPIToken == "" {
		return nil, fmt.Errorf("cloudflare credentials not configured")
	}

	client := &http.Client{Timeout: 15 * time.Second}
	base := "https://api.cloudflare.com/client/v4/accounts/" + s.cfg.CloudflareAccountID + "/r2/buckets"

	authHeaders := map[string]string{
		"Authorization": "Bearer " + s.cfg.CloudflareAPIToken,
		"Content-Type":  "application/json",
	}

	listResp, err := httpGetJSON(ctx, client, base, authHeaders)
	if err != nil {
		return nil, err
	}
	var listData struct {
		Success bool `json:"success"`
		Result  struct {
			Buckets []map[string]any `json:"buckets"`
		} `json:"result"`
	}
	if err := json.Unmarshal(listResp, &listData); err != nil || !listData.Success {
		return nil, fmt.Errorf("failed to parse cloudflare buckets response")
	}
	buckets := listData.Result.Buckets
	if buckets == nil {
		buckets = []map[string]any{}
	}

	fallbackUsage := map[string]any{"payloadSize": 0, "metadataSize": 0, "objectCount": 0, "uploadCount": 0}

	var wg sync.WaitGroup
	out := make([]map[string]any, len(buckets))
	for i, bucket := range buckets {
		wg.Add(1)
		go func(i int, bucket map[string]any) {
			defer wg.Done()
			name, _ := bucket["name"].(string)
			usage := fallbackUsage
			if name != "" {
				usageResp, err := httpGetJSON(ctx, client, base+"/"+name+"/usage", authHeaders)
				if err == nil {
					var usageData struct {
						Success bool           `json:"success"`
						Result  map[string]any `json:"result"`
					}
					if json.Unmarshal(usageResp, &usageData) == nil && usageData.Success && usageData.Result != nil {
						usage = usageData.Result
					}
				}
			}
			merged := map[string]any{}
			for k, v := range bucket {
				merged[k] = v
			}
			merged["usage"] = usage
			out[i] = merged
		}(i, bucket)
	}
	wg.Wait()

	return out, nil
}

func httpGetJSON(ctx context.Context, client *http.Client, url string, headers map[string]string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("status %d", resp.StatusCode)
	}
	return body, nil
}
