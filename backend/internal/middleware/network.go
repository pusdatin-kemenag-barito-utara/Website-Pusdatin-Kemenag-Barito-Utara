package middleware

import (
	"github.com/gofiber/fiber/v3"
)

// EnterpriseHeadersMiddleware injects HTTP/3 Alt-Svc, modern security headers,
// and resource timing policies to achieve enterprise-grade network delivery.
func EnterpriseHeadersMiddleware() fiber.Handler {
	return func(c fiber.Ctx) error {
		// 1. HTTP/3 (QUIC) Protocol Advertisement for Cloudflare & Reverse Proxies
		c.Set("Alt-Svc", `h3=":443"; ma=86400, h3-29=":443"; ma=86400, h3-27=":443"; ma=86400`)

		// 2. HTTP/2 & HTTP/3 Early Hints Link Preload Header
		c.Set("Link", `</branding/pusdatin.png>; rel=preload; as=image; fetchpriority=high`)

		// 3. Enterprise Security Headers
		c.Set("X-Content-Type-Options", "nosniff")
		c.Set("X-Frame-Options", "SAMEORIGIN")
		c.Set("X-XSS-Protection", "1; mode=block")
		c.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()")
		c.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")

		// 4. Performance & Resource Timing Visibility
		c.Set("Timing-Allow-Origin", "*")

		// 5. Cloudflare CDN & Proxy Optimization
		path := c.Path()
		if path == "/api/health" || path == "/api/landing/stats" || path == "/api/announcements" {
			c.Set("Cloudflare-CDN-Cache-Control", "public, max-age=60, stale-while-revalidate=300")
			c.Set("CDN-Cache-Control", "public, max-age=60, stale-while-revalidate=300")
		}

		return c.Next()
	}
}
