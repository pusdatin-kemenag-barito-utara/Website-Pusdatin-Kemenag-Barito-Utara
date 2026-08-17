package router

import (
	"github.com/gofiber/fiber/v2"

	"pusdatin/backend/internal/handlers"
	"pusdatin/backend/internal/middleware"
	"pusdatin/backend/internal/services"
)

type Handlers struct {
	Auth         *handlers.AuthHandler
	User         *handlers.UserHandler
	App          *handlers.AppHandler
	Pejabat      *handlers.PejabatHandler
	Report       *handlers.ReportHandler
	System       *handlers.SystemHandler
	Storage      *handlers.StorageHandler
	Announcement *handlers.AnnouncementHandler
}

// Register wires all HTTP routes with appropriate middlewares and handlers.
func Register(app *fiber.App, h *Handlers, authService *services.AuthService) {
	// Public routes (no auth required)
	app.Get("/api/health", h.System.HealthHandler)
	app.Get("/api/landing/stats", h.Report.LandingStatsHandler)
	app.Get("/api/announcements", h.Announcement.ListPublic)
	app.Get("/uploads/apps/:file", h.Storage.UploadsProxy)
	app.Get("/uploads/*", h.Storage.UploadsProxy)
	app.All("/api/public/apps/:id/status", h.App.PublicAppStatus)

	// Auth + SSO group (session resolved, no admin requirement)
	authGroup := app.Group("/api", middleware.AuthMiddleware(authService))
	authGroup.Post("/auth/login", middleware.RateLimit("login", 5, 60000), h.Auth.LoginHandler)
	authGroup.Post("/auth/logout", h.Auth.LogoutHandler)
	authGroup.Post("/auth/mfa/complete", middleware.RateLimit("mfa", 5, 60000), h.Auth.MFACompleteHandler)
	authGroup.Get("/auth/session", h.Auth.SessionHandler)
	authGroup.Get("/sso/jump", h.Auth.SSOJumpHandler)

	// Protected group (admin only)
	admin := app.Group("/api", middleware.AuthMiddleware(authService), middleware.AdminRequired())

	// System & Reports
	admin.Get("/system/health", h.System.SystemHealth)
	admin.Get("/system/realtime", h.System.RealtimeMetrics)
	admin.Get("/dashboard/stats", h.Report.DashboardStats)
	admin.Get("/reports/activity", h.Report.ReportActivity)
	admin.Get("/reports/app-summary", h.Report.ReportAppSummary)

	// Audit Logs
	admin.Get("/audit-logs", h.Report.ListAuditLogs)
	admin.Delete("/audit-logs", h.Report.DeleteAuditLogs)

	// User Management
	admin.Get("/users", h.User.ListUsers)
	admin.Post("/users", h.User.CreateUser)
	admin.Get("/users/:id", h.User.GetUser)
	admin.Put("/users/:id", h.User.UpdateUser)
	admin.Delete("/users/:id", h.User.DeleteUser)

	// App Management
	admin.Get("/apps", h.App.ListApps)
	admin.Post("/apps", h.App.CreateApp)
	admin.Patch("/apps/:id", h.App.UpdateApp)
	admin.Delete("/apps/:id", h.App.DeleteApp)
	admin.Put("/apps/:id/status", h.App.UpdateAppStatus)
	admin.Post("/apps/bulk-status", h.App.BulkUpdateAppStatus)

	// Pejabat Management
	admin.Get("/pejabat", h.Pejabat.ListPejabat)
	admin.Post("/pejabat", h.Pejabat.SetPejabat)
	admin.Put("/pejabat/:id", h.Pejabat.UpdatePejabat)
	admin.Delete("/pejabat/:id", h.Pejabat.DeletePejabat)

	// Announcement Management
	admin.Get("/announcements/admin", h.Announcement.ListAnnouncements)
	admin.Post("/announcements", h.Announcement.CreateAnnouncement)
	admin.Get("/announcements/:id", h.Announcement.GetAnnouncement)
	admin.Put("/announcements/:id", h.Announcement.UpdateAnnouncement)
	admin.Delete("/announcements/:id", h.Announcement.DeleteAnnouncement)

	// File Storage & Cloudflare R2
	admin.Post("/upload", h.Storage.UploadFile)
	admin.Get("/r2/buckets", h.Storage.R2Buckets)
}
