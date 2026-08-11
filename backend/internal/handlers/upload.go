package handlers

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/gofiber/fiber/v2"
)

func (h *Handler) S3Client() (*s3.Client, error) {
	cfg, err := awsconfig.LoadDefaultConfig(context.Background(),
		awsconfig.WithRegion("auto"),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			h.Cfg.R2AccessKeyID, h.Cfg.R2SecretAccessKey, "",
		)),
	)
	if err != nil {
		return nil, err
	}
	return s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(h.Cfg.R2EndpointURL)
		o.UsePathStyle = true
		o.RequestChecksumCalculation = aws.RequestChecksumCalculationWhenRequired
		o.ResponseChecksumValidation = aws.ResponseChecksumValidationWhenRequired
	}), nil
}

// UploadFile handles POST /api/upload (admin) — mirrors the old route.
func (h *Handler) UploadFile(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "No file uploaded"})
	}

	src, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Internal server error"})
	}
	defer src.Close()

	data, err := io.ReadAll(src)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Internal server error"})
	}

	uniqueSuffix := fmt.Sprintf("%d-%d", time.Now().UnixMilli(), randInt())
	ext := path.Ext(file.Filename)
	if ext == "" {
		ext = ".png"
	}
	filename := "app-logo-" + uniqueSuffix + ext
	objectKey := "apps/" + filename

	bucket := h.Cfg.R2BucketPusdatin
	if bucket == "" {
		bucket = "data-pusdatin"
	}
	contentType := file.Header.Get("Content-Type")
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

	client, err := h.S3Client()
	if err != nil {
		fmt.Printf("[UPLOAD ERROR] S3Client init failed: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Internal server error"})
	}
	contentLength := int64(len(data))
	if _, err := client.PutObject(c.Context(), &s3.PutObjectInput{
		Bucket:        aws.String(bucket),
		Key:           aws.String(objectKey),
		Body:          bytes.NewReader(data),
		ContentLength: aws.Int64(contentLength),
		ContentType:   aws.String(contentType),
	}); err != nil {
		fmt.Printf("[UPLOAD ERROR] PutObject failed: %v\n", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Internal server error"})
	}

	return c.JSON(fiber.Map{
		"url":     "/uploads/apps/" + filename,
		"message": "File uploaded successfully",
	})
}

// UploadsProxy streams an object from R2 at GET /uploads/apps/:file with local disk fallback.
func (h *Handler) UploadsProxy(c *fiber.Ctx) error {
	filename := c.Params("file")
	if filename == "" {
		filename = c.Params("*")
	}
	filename = filepath.Base(filename)
	if filename == "" || filename == "." || filename == "/" {
		return c.SendStatus(fiber.StatusNotFound)
	}

	// 1. Check local disk fallback first
	localPaths := []string{
		filepath.Join("public", "uploads", "apps", filename),
		filepath.Join("uploads", "apps", filename),
		filepath.Join("..", "frontend", "public", "uploads", "apps", filename),
		filepath.Join("..", "uploads", "apps", filename),
	}
	for _, lp := range localPaths {
		if _, err := os.Stat(lp); err == nil {
			return c.SendFile(lp)
		}
	}

	// 2. Check R2 cloud storage across candidate keys & buckets
	client, err := h.S3Client()
	if err != nil {
		fmt.Printf("[UploadsProxy] s3Client error: %v\n", err)
		return c.SendStatus(fiber.StatusInternalServerError)
	}

	candidateBuckets := []string{
		h.Cfg.R2BucketPusdatin,
		"data-arsip",
		"data-inklusi",
		"data-ppid",
		"data-ptsp",
		"data-surat",
	}

	candidateKeys := []string{
		"apps/" + filename,
		filename,
		"uploads/apps/" + filename,
		"uploads/" + filename,
	}

	var out *s3.GetObjectOutput
	var lastErr error

	for _, bucket := range candidateBuckets {
		if bucket == "" {
			continue
		}
		for _, objectKey := range candidateKeys {
			res, err := client.GetObject(c.Context(), &s3.GetObjectInput{
				Bucket: aws.String(bucket),
				Key:    aws.String(objectKey),
			})
			if err == nil {
				out = res
				break
			}
			lastErr = err
		}
		if out != nil {
			break
		}
	}

	if out == nil {
		fmt.Printf("[UploadsProxy] R2 object not found for %s: %v\n", filename, lastErr)
		return c.SendStatus(fiber.StatusNotFound)
	}
	defer out.Body.Close()

	if out.ContentLength != nil {
		c.Set("Content-Length", fmt.Sprintf("%d", *out.ContentLength))
	}

	ct := "application/octet-stream"
	if out.ContentType != nil && *out.ContentType != "" && *out.ContentType != "application/octet-stream" {
		ct = *out.ContentType
	} else {
		ext := strings.ToLower(path.Ext(filename))
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
	c.Set("Content-Type", ct)
	c.Set("Cache-Control", "public, max-age=31536000, immutable")

	if _, err := io.Copy(c, out.Body); err != nil {
		return c.SendStatus(fiber.StatusInternalServerError)
	}
	return nil
}

func randInt() int {
	return int(time.Now().UnixNano() % 1_000_000_000)
}

func bytesReader(b []byte) io.Reader {
	return &sliceReader{b: b}
}

type sliceReader struct {
	b []byte
	i int
}

func (r *sliceReader) Read(p []byte) (int, error) {
	if r.i >= len(r.b) {
		return 0, io.EOF
	}
	n := copy(p, r.b[r.i:])
	r.i += n
	return n, nil
}
