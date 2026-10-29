package services

import (
	"bytes"
	"context"
	"fmt"
	"io"
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

type MemoryCachedObject struct {
	Data        []byte
	ContentType string
}

type StorageService struct {
	cfg   *config.Config
	cache map[string]*MemoryCachedObject
	mu    sync.RWMutex
}

func NewStorageService(cfg *config.Config) *StorageService {
	return &StorageService{
		cfg:   cfg,
		cache: make(map[string]*MemoryCachedObject),
	}
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

	// Cache directly in RAM
	s.mu.Lock()
	s.cache[filename] = &MemoryCachedObject{
		Data:        data,
		ContentType: contentType,
	}
	s.mu.Unlock()

	publicBase := strings.TrimRight(s.cfg.R2PublicURL, "/")
	if publicBase == "" {
		return "", fmt.Errorf("R2_PUBLIC_URL is not configured")
	}
	return fmt.Sprintf("%s/apps/%s", publicBase, filename), nil
}

func (s *StorageService) GetPublicAppURL(filename string) string {
	publicBase := strings.TrimRight(s.cfg.R2PublicURL, "/")
	if publicBase == "" {
		return ""
	}
	return fmt.Sprintf("%s/apps/%s", publicBase, filename)
}

type StorageProxyResult struct {
	Data        []byte
	ContentType string
}

func (s *StorageService) ResolveUploadObject(ctx context.Context, filename string) (*StorageProxyResult, error) {
	cleanName := filepath.Base(filename)
	if cleanName == "" || cleanName == "." || cleanName == "/" {
		return nil, domain.ErrNotFound
	}

	// 1. Check in-memory RAM cache
	s.mu.RLock()
	if cached, ok := s.cache[cleanName]; ok && cached != nil {
		s.mu.RUnlock()
		return &StorageProxyResult{
			Data:        cached.Data,
			ContentType: cached.ContentType,
		}, nil
	}
	s.mu.RUnlock()

	// 2. Query R2 cloud storage across candidate keys & buckets
	client, err := s.S3Client(ctx)
	if err != nil {
		return nil, fmt.Errorf("s3 client: %w", err)
	}

	candidateBuckets := []string{
		s.cfg.R2BucketPusdatin,
		"data-ptsp",
		"data-arsip",
		"data-surat",
		"data-inklusi",
		"data-ppid",
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

	bodyBytes, err := io.ReadAll(out.Body)
	_ = out.Body.Close()
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
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

	// Cache directly in RAM for instant subsequent hits
	s.mu.Lock()
	s.cache[cleanName] = &MemoryCachedObject{
		Data:        bodyBytes,
		ContentType: ct,
	}
	s.mu.Unlock()

	return &StorageProxyResult{
		Data:        bodyBytes,
		ContentType: ct,
	}, nil
}
