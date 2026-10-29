package middleware

import (
	"log"
	"os"
	"time"

	"github.com/getsentry/sentry-go"
	sentryfiber "github.com/getsentry/sentry-go/fiberv3"
	"github.com/gofiber/fiber/v3"
)

// InitSentry menginisialisasi Sentry client untuk Backend Golang (Fiber v3)
// dioptimasi khusus untuk Free Tier (100% error terdeteksi tanpa memboroskan kuota).
func InitSentry(dsn string) fiber.Handler {
	if dsn == "" {
		log.Println("ℹ️ Sentry DSN kosong, pemantauan Sentry backend dinonaktifkan")
		return func(c fiber.Ctx) error {
			return c.Next()
		}
	}

	env := os.Getenv("NODE_ENV")
	if env == "" {
		env = os.Getenv("APP_ENV")
	}
	if env == "" {
		env = "development"
	}

	tracesRate := 1.0
	if env == "production" || env == "prod" {
		tracesRate = 0.1 // 10% tracing sampling di production untuk menjaga kuota free tier
	}

	err := sentry.Init(sentry.ClientOptions{
		Dsn:              dsn,
		EnableTracing:    true,
		TracesSampleRate: tracesRate,
		Environment:      env,
		ServerName:       "pusdatin-backend-golang",
	})
	if err != nil {
		log.Printf("⚠️ Gagal inisialisasi Sentry: %v", err)
		return func(c fiber.Ctx) error {
			return c.Next()
		}
	}

	log.Println("🛡️ Sentry Go Fiber v3 berhasil diinisialisasi untuk Pusdatin")

	return sentryfiber.New(sentryfiber.Options{
		Repanic:         true,
		WaitForDelivery: true,
		Timeout:         2 * time.Second,
	})
}

