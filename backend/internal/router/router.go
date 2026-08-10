package router

import (
	"github.com/gofiber/fiber/v2"

	"pusdatin/backend/internal/auth"
	"pusdatin/backend/internal/handlers"
)

// Register wires every route, mirroring the old Next.js /api routes.
func Register(app *fiber.App, h *handlers.Handler, deps *auth.HandlerDeps) {
	// Public routes (no auth).
	app.Get("/api/health", h.HealthHandler)
	app.Get("/api/landing/stats", h.LandingStatsHandler)
	app.Get("/uploads/apps/:file", h.UploadsProxy)
	app.All("/api/public/apps/:id/status", h.PublicAppStatus)

	// Auth + SSO group (session resolved, no admin requirement).
	authGroup := app.Group("/api", auth.Middleware(deps))
	authGroup.Post("/auth/login", auth.RateLimit("login", 5, 60000), h.LoginHandler)
	authGroup.Post("/auth/logout", h.LogoutHandler)
	authGroup.Post("/auth/mfa/complete", auth.RateLimit("mfa", 5, 60000), h.MFACompleteHandler)
	authGroup.Get("/auth/session", h.SessionHandler)
	authGroup.Get("/sso/jump", h.SSOJumpHandler)

	// Protected group (admin only) — mirrors the old requireAdmin checks.
	admin := app.Group("/api", auth.Middleware(deps), auth.AdminRequired())

	admin.Get("/system/health", h.SystemHealth)
	admin.Get("/system/realtime", h.RealtimeMetrics)
	admin.Get("/dashboard/stats", h.DashboardStats)
	admin.Get("/reports/activity", h.ReportActivity)
	admin.Get("/reports/app-summary", h.ReportAppSummary)

	admin.Get("/audit-logs", h.ListAuditLogs)
	admin.Delete("/audit-logs", h.DeleteAuditLogs)

	admin.Get("/users", h.ListUsers)
	admin.Post("/users", h.CreateUser)
	admin.Get("/users/:id", h.GetUser)
	admin.Put("/users/:id", h.UpdateUser)
	admin.Delete("/users/:id", h.DeleteUser)

	admin.Get("/apps", h.ListApps)
	admin.Post("/apps", h.CreateApp)
	admin.Patch("/apps/:id", h.UpdateApp)
	admin.Delete("/apps/:id", h.DeleteApp)
	admin.Put("/apps/:id/status", h.UpdateAppStatus)
	admin.Post("/apps/bulk-status", h.BulkUpdateAppStatus)

	admin.Get("/pejabat", h.ListPejabat)
	admin.Post("/pejabat", h.SetPejabat)
	admin.Put("/pejabat/:id", h.UpdatePejabat)
	admin.Delete("/pejabat/:id", h.DeletePejabat)

	admin.Post("/upload", h.UploadFile)
	admin.Get("/r2/buckets", h.R2Buckets)
}
