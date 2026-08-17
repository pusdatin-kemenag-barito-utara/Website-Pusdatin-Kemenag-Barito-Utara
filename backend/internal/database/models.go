package database

import "pusdatin/backend/internal/domain"

// Type aliases for domain entities to maintain clean backward compatibility.
type AppPermission = domain.AppPermission
type User = domain.User
type App = domain.App
type AuditLog = domain.AuditLog
type AuditRow = domain.AuditLog
type AuditFilter = domain.AuditFilter
type ActivityPoint = domain.ActivityPoint
type ActivityData = domain.ActivityPoint
type AppSummaryItem = domain.AppSummaryItem
type DashboardStats = domain.DashboardStats
type LandingStats = domain.LandingStats
type LandingData = domain.LandingData
type Pejabat = domain.Pejabat
type SystemHealth = domain.SystemHealth
type TrustedDevice = domain.TrustedDevice
