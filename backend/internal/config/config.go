package config

import (
	"fmt"
	"os"
	"path/filepath"

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

	R2AccessKeyID     string
	R2SecretAccessKey string
	R2EndpointURL     string
	R2BucketPusdatin  string
	R2BucketBackup    string
	R2PublicURL       string

	RedisURL string

	SiteURL string

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

	pbURL := getEnv("POCKETBASE_URL", getEnv("PUBLIC_POCKETBASE_URL", "https://db-pusdatin.kemenag-baritoutara.com"))
	pbAdminEmail := getEnv("POCKETBASE_ADMIN_EMAIL", getEnv("SUPER_ADMIN_EMAIL", "baritoutara@kemenag.go.id"))
	pbAdminPassword := getEnv("POCKETBASE_ADMIN_PASSWORD", "@Kemenag_126")

	cfg := &Config{
		Port:                    getEnv("BACKEND_PORT", "8080"),
		PocketBaseURL:           pbURL,
		PocketBaseAdminEmail:    pbAdminEmail,
		PocketBaseAdminPassword: pbAdminPassword,
		TurnstileSecretKey:      os.Getenv("TURNSTILE_SECRET_KEY"),
		TrustedDeviceSecret:     os.Getenv("TRUSTED_DEVICE_SECRET"),
		SuperAdminEmail:         getEnv("SUPER_ADMIN_EMAIL", "baritoutara@kemenag.go.id"),
		CloudflareAccountID:     os.Getenv("CLOUDFLARE_ACCOUNT_ID"),
		CloudflareAPIToken:      os.Getenv("CLOUDFLARE_API_TOKEN"),
		R2AccessKeyID:           os.Getenv("R2_ACCESS_KEY_ID"),
		R2SecretAccessKey:       os.Getenv("R2_SECRET_ACCESS_KEY"),
		R2EndpointURL:           os.Getenv("R2_ENDPOINT_URL"),
		R2BucketPusdatin:        getEnv("R2_BUCKET_PUSDATIN", "data-pusdatin"),
		R2BucketBackup:          getEnv("R2_BUCKET_BACKUP", "database-back-up-daily"),
		R2PublicURL:             getEnv("R2_PUBLIC_URL", "https://files.kemenag-baritoutara.com/pusdatin"),
		RedisURL:                os.Getenv("REDIS_URL"),
		SiteURL:                 getEnv("PUBLIC_SITE_URL", getEnv("SITE_URL", "https://pusdatin.kemenag-baritoutara.com")),
		IsProduction:            env == "production" || env == "prod",
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

func (c *Config) validate() error {
	required := map[string]string{
		"POCKETBASE_URL":           c.PocketBaseURL,
		"POCKETBASE_ADMIN_EMAIL":   c.PocketBaseAdminEmail,
		"POCKETBASE_ADMIN_PASSWORD": c.PocketBaseAdminPassword,
		"TURNSTILE_SECRET_KEY":     c.TurnstileSecretKey,
		"TRUSTED_DEVICE_SECRET":    c.TrustedDeviceSecret,
		"SUPER_ADMIN_EMAIL":        c.SuperAdminEmail,
		"CLOUDFLARE_ACCOUNT_ID":    c.CloudflareAccountID,
		"CLOUDFLARE_API_TOKEN":     c.CloudflareAPIToken,
		"R2_ACCESS_KEY_ID":         c.R2AccessKeyID,
		"R2_SECRET_ACCESS_KEY":     c.R2SecretAccessKey,
		"R2_ENDPOINT_URL":          c.R2EndpointURL,
	}
	for name, val := range required {
		if val == "" {
			return fmt.Errorf("missing required env var: %s", name)
		}
	}
	if c.TrustedDeviceSecret == c.TurnstileSecretKey {
		return fmt.Errorf("TRUSTED_DEVICE_SECRET must be a dedicated secret, not equal to TURNSTILE_SECRET_KEY")
	}
	return nil
}
