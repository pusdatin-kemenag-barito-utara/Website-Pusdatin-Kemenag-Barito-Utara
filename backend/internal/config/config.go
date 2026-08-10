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

	DatabaseURL string

	SupabaseURL            string
	SupabaseAnonKey        string
	SupabasePublishableKey string
	SupabaseServiceRoleKey string

	TurnstileSecretKey string

	TrustedDeviceSecret string

	SuperAdminEmail string

	CloudflareAccountID string
	CloudflareAPIToken  string

	R2AccessKeyID     string
	R2SecretAccessKey string
	R2EndpointURL     string
	R2BucketPusdatin  string

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

// Load reads configuration from backend/.env, root .env.local (dev convenience),
// and environment variables (highest precedence).
func Load() (*Config, error) {
	_ = godotenv.Load(filepath.Join("..", ".env"))
	_ = godotenv.Load(".env")

	env := getEnv("NODE_ENV", getEnv("APP_ENV", "development"))

	cfg := &Config{
		Port:                   getEnv("BACKEND_PORT", "8080"),
		DatabaseURL:            os.Getenv("DATABASE_URL"),
		SupabaseURL:            getEnv("PUBLIC_SUPABASE_URL", os.Getenv("SUPABASE_URL")),
		SupabaseAnonKey:        getEnv("PUBLIC_SUPABASE_ANON_KEY", getEnv("SUPABASE_ANON_KEY", getEnv("PUBLIC_SUPABASE_PUBLISHABLE_KEY", os.Getenv("SUPABASE_PUBLISHABLE_KEY")))),
		SupabasePublishableKey: getEnv("PUBLIC_SUPABASE_PUBLISHABLE_KEY", getEnv("SUPABASE_PUBLISHABLE_KEY", getEnv("PUBLIC_SUPABASE_ANON_KEY", os.Getenv("SUPABASE_ANON_KEY")))),
		SupabaseServiceRoleKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		TurnstileSecretKey:     os.Getenv("TURNSTILE_SECRET_KEY"),
		TrustedDeviceSecret:    os.Getenv("TRUSTED_DEVICE_SECRET"),
		SuperAdminEmail:        os.Getenv("SUPER_ADMIN_EMAIL"),
		CloudflareAccountID:    os.Getenv("CLOUDFLARE_ACCOUNT_ID"),
		CloudflareAPIToken:     os.Getenv("CLOUDFLARE_API_TOKEN"),
		R2AccessKeyID:          os.Getenv("R2_ACCESS_KEY_ID"),
		R2SecretAccessKey:      os.Getenv("R2_SECRET_ACCESS_KEY"),
		R2EndpointURL:          os.Getenv("R2_ENDPOINT_URL"),
		R2BucketPusdatin:       getEnv("R2_BUCKET_PUSDATIN", "data-pusdatin"),
		RedisURL:               os.Getenv("REDIS_URL"),
		SiteURL:                getEnv("PUBLIC_SITE_URL", getEnv("SITE_URL", "https://pusdatin.kemenag-baritoutara.com")),
		IsProduction:           env == "production" || env == "prod",
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}
	return cfg, nil
}

func (c *Config) validate() error {
	required := map[string]string{
		"DATABASE_URL":              c.DatabaseURL,
		"SUPABASE_URL":              c.SupabaseURL,
		"SUPABASE_ANON_KEY":         c.SupabaseAnonKey,
		"SUPABASE_SERVICE_ROLE_KEY": c.SupabaseServiceRoleKey,
		"TURNSTILE_SECRET_KEY":      c.TurnstileSecretKey,
		"TRUSTED_DEVICE_SECRET":     c.TrustedDeviceSecret,
		"SUPER_ADMIN_EMAIL":         c.SuperAdminEmail,
		"CLOUDFLARE_ACCOUNT_ID":     c.CloudflareAccountID,
		"CLOUDFLARE_API_TOKEN":      c.CloudflareAPIToken,
		"R2_ACCESS_KEY_ID":          c.R2AccessKeyID,
		"R2_SECRET_ACCESS_KEY":      c.R2SecretAccessKey,
		"R2_ENDPOINT_URL":           c.R2EndpointURL,
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
