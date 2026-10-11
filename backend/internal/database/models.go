package database

import "pusdatin/backend/internal/domain"

// Type aliases for domain entities to maintain clean backward compatibility.
type AppPermission = domain.AppPermission
type User = domain.User
type App = domain.App
type DashboardStats = domain.DashboardStats
type LandingStats = domain.LandingStats
type LandingData = domain.LandingData
type SystemHealth = domain.SystemHealth
type TrustedDevice = domain.TrustedDevice
