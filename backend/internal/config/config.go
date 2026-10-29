package config

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration loaded from env / .env files.
type Config struct {
	Port string

	PocketBaseURL           string
	PocketBaseAdminEmail    string
	PocketBaseAdminPassword string

	TurnstileSecretKey string

	TrustedDeviceSecret string

	SuperAdminEmail string

	CloudflareAccountID string
	CloudflareAPIToken  string
	CloudflareZoneID    string

	R2AccessKeyID     string
	R2SecretAccessKey string
	R2EndpointURL     string
	R2BucketPusdatin  string
	R2PublicURL       string

	RedisURL string

	SiteURL string

	SentryDSN string

	IsProduction bool
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// Load reads configuration from backend/.env, root .env (dev convenience),
// and environment variables (highest precedence).
func Load() (*Config, error) {
	_ = godotenv.Load(filepath.Join("..", ".env"))
	_ = godotenv.Load(".env")

	env := getEnv("NODE_ENV", getEnv("APP_ENV", "development"))
	infEnv := "dev"
	if env == "production" || env == "prod" {
		infEnv = "prod"
	}

	// Always sync fresh secrets from Infisical if critical secrets are missing in process env
	if os.Getenv("CLOUDFLARE_ZONE_ID") == "" || os.Getenv("CLOUDFLARE_API_TOKEN") == "" {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		_, _ = FetchSecretsFromInfisical(ctx, infEnv)
		cancel()
	}

	pbURL := getEnv("POCKETBASE_URL", os.Getenv("PUBLIC_POCKETBASE_URL"))
	pbAdminEmail := getEnv("POCKETBASE_ADMIN_EMAIL", os.Getenv("SUPER_ADMIN_EMAIL"))
	pbAdminPassword := os.Getenv("POCKETBASE_ADMIN_PASSWORD")

	cfg := &Config{
		Port:                    getEnv("BACKEND_PORT", getEnv("PORT", "8080")),
		PocketBaseURL:           pbURL,
		PocketBaseAdminEmail:    pbAdminEmail,
		PocketBaseAdminPassword: pbAdminPassword,
		TurnstileSecretKey:      os.Getenv("TURNSTILE_SECRET_KEY"),
		TrustedDeviceSecret:     os.Getenv("TRUSTED_DEVICE_SECRET"),
		SuperAdminEmail:         os.Getenv("SUPER_ADMIN_EMAIL"),
		CloudflareAccountID:     os.Getenv("CLOUDFLARE_ACCOUNT_ID"),
		CloudflareAPIToken:      os.Getenv("CLOUDFLARE_API_TOKEN"),
		CloudflareZoneID:        os.Getenv("CLOUDFLARE_ZONE_ID"),
		R2AccessKeyID:           os.Getenv("R2_ACCESS_KEY_ID"),
		R2SecretAccessKey:       os.Getenv("R2_SECRET_ACCESS_KEY"),
		R2EndpointURL:           os.Getenv("R2_ENDPOINT_URL"),
		R2BucketPusdatin:        os.Getenv("R2_BUCKET_PUSDATIN"),
		R2PublicURL:             os.Getenv("R2_PUBLIC_URL"),
		RedisURL:                os.Getenv("REDIS_URL"),
		SiteURL:                 getEnv("PUBLIC_SITE_URL", os.Getenv("SITE_URL")),
		SentryDSN:               getEnv("SENTRY_DSN", os.Getenv("PUBLIC_SENTRY_DSN")),
		IsProduction:            env == "production" || env == "prod",
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

func (c *Config) validate() error {
	required := map[string]string{
		"POCKETBASE_URL":            c.PocketBaseURL,
		"POCKETBASE_ADMIN_EMAIL":    c.PocketBaseAdminEmail,
		"POCKETBASE_ADMIN_PASSWORD": c.PocketBaseAdminPassword,
		"TURNSTILE_SECRET_KEY":      c.TurnstileSecretKey,
		"TRUSTED_DEVICE_SECRET":     c.TrustedDeviceSecret,
		"SUPER_ADMIN_EMAIL":         c.SuperAdminEmail,
		"CLOUDFLARE_ACCOUNT_ID":     c.CloudflareAccountID,
		"CLOUDFLARE_API_TOKEN":      c.CloudflareAPIToken,
		"CLOUDFLARE_ZONE_ID":        c.CloudflareZoneID,
		"R2_ACCESS_KEY_ID":          c.R2AccessKeyID,
		"R2_SECRET_ACCESS_KEY":      c.R2SecretAccessKey,
		"R2_ENDPOINT_URL":           c.R2EndpointURL,
	}
	for name, val := range required {
		if val == "" {
			return fmt.Errorf("missing required environment variable from Infisical: %s", name)
		}
	}
	if c.TrustedDeviceSecret == c.TurnstileSecretKey {
		return fmt.Errorf("TRUSTED_DEVICE_SECRET must be a dedicated secret, not equal to TURNSTILE_SECRET_KEY")
	}
	return nil
}
