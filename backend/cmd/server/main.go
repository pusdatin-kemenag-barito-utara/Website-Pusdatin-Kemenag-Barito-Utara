package main

import (
	"context"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"pusdatin/backend/internal/auth"
	"pusdatin/backend/internal/config"
	"pusdatin/backend/internal/database"
	"pusdatin/backend/internal/handlers"
	"pusdatin/backend/internal/router"
	"pusdatin/backend/internal/services"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx := context.Background()

	// 1. Initialize Database Repository (Adapter)
	pool, err := database.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()

	store := database.NewStore(pool)

	// 2. Initialize External Clients & Security Providers
	authClient := auth.NewClient(cfg.SupabaseURL, cfg.SupabaseAnonKey, cfg.SupabaseServiceRoleKey)
	turnstile := auth.NewTurnstileVerifier()
	tdService := auth.NewTrustedDeviceService(store, cfg.TrustedDeviceSecret)

	// 3. Initialize Domain Services (Use-Cases)
	authService := services.NewAuthService(cfg, store, store, store, authClient, turnstile, tdService)
	userService := services.NewUserService(store, store, authClient)
	appService := services.NewAppService(store, store)
	pejabatService := services.NewPejabatService(store, store)
	reportService := services.NewReportService(store, store, store, store)
	systemService := services.NewSystemService(store)
	storageService := services.NewStorageService(cfg)
	announcementService := services.NewAnnouncementService(store, store)

	// 4. Background Daemons (Metrics Monitor)
	go systemService.StartMetricsMonitor(ctx, 60*time.Second)

	// 5. Initialize Primary Adapters (HTTP Handlers)
	h := &router.Handlers{
		Auth:         handlers.NewAuthHandler(cfg, authService),
		User:         handlers.NewUserHandler(userService),
		App:          handlers.NewAppHandler(appService),
		Pejabat:      handlers.NewPejabatHandler(pejabatService),
		Report:       handlers.NewReportHandler(reportService),
		System:       handlers.NewSystemHandler(systemService),
		Storage:      handlers.NewStorageHandler(storageService),
		Announcement: handlers.NewAnnouncementHandler(announcementService),
	}

	// 6. Setup Fiber Web Server
	app := fiber.New(fiber.Config{
		AppName:        "PTSP Kemenag Barito Utara API (Enterprise Clean Architecture v2.1)",
		BodyLimit:      10 * 1024 * 1024,
		ReadBufferSize: 32 * 1024, // 32KB buffer to handle large cookie headers (prevents HTTP 431)
	})
	app.Use(recover.New())

	// 7. Register HTTP Routes
	router.Register(app, h, authService)

	log.Printf("✅ Server PTSP Backend (Enterprise Clean Architecture) berjalan di port %s", cfg.Port)
	log.Printf("✅ Frontend asal: %s", cfg.SiteURL)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("listen: %v", err)
	}
}
