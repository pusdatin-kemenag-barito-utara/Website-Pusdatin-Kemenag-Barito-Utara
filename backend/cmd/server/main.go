package main

import (
	"context"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"pusdatin/backend/internal/auth"
	"pusdatin/backend/internal/config"
	"pusdatin/backend/internal/database"
	"pusdatin/backend/internal/handlers"
	"pusdatin/backend/internal/router"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx := context.Background()

	dbCfg, err := pgxpool.ParseConfig(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database config parse: %v", err)
	}
	dbCfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol

	pool, err := pgxpool.NewWithConfig(ctx, dbCfg)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()

	store := database.NewStore(pool)

	authClient := auth.NewClient(cfg.SupabaseURL, cfg.SupabaseAnonKey, cfg.SupabaseServiceRoleKey)
	td := auth.NewTrustedDeviceService(store, cfg.TrustedDeviceSecret)

	h := handlers.New(cfg, store, authClient, td)
	deps := &auth.HandlerDeps{Cfg: cfg, Store: store, Auth: authClient, TD: td}

	go h.MonitorMetrics(ctx, 60*time.Second)

	app := fiber.New(fiber.Config{
		BodyLimit: 10 * 1024 * 1024,
	})
	app.Use(recover.New())
	router.Register(app, h, deps)

	// Start the HTTP listener immediately so the API is reachable while the
	// database connection is still warming up (prevents long ECONNRESET
	// windows after a restart). The DB ping runs in parallel with a timeout.
	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	go func() {
		if err := pool.Ping(pingCtx); err != nil {
			log.Printf("database ping failed (will retry on demand): %v", err)
		} else {
			log.Printf("database connection ready")
		}
	}()

	log.Printf("pusdatin backend listening on :%s", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("listen: %v", err)
	}
}
