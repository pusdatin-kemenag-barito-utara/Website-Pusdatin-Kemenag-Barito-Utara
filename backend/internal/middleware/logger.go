package middleware

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v3"

	"pusdatin/backend/internal/domain"
)

// ANSI Color Codes for terminal formatting
const (
	colorReset  = "\033[0m"
	colorRed    = "\033[31m"
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorBlue   = "\033[34m"
	colorPurple = "\033[35m"
	colorCyan   = "\033[36m"
	colorGray   = "\033[90m"
	colorBold   = "\033[1m"
)

// EnterpriseLogger returns a high-detail HTTP request logger middleware
func EnterpriseLogger() fiber.Handler {
	return func(c fiber.Ctx) error {
		start := time.Now()

		// Execute next handler in chain
		err := c.Next()

		latency := time.Since(start)
		status := c.Response().StatusCode()
		if err != nil {
			if fiberErr, ok := err.(*fiber.Error); ok {
				status = fiberErr.Code
			} else {
				status = fiber.StatusInternalServerError
			}
		}

		// 1. Format Status Icon & Color
		var statusStr string
		switch {
		case status >= 200 && status < 300:
			statusStr = fmt.Sprintf("%s🟢 %d OK%s", colorGreen, status, colorReset)
		case status >= 300 && status < 400:
			statusStr = fmt.Sprintf("%s🟡 %d REDIR%s", colorYellow, status, colorReset)
		case status >= 400 && status < 500:
			statusStr = fmt.Sprintf("%s🟠 %d WARN%s", colorYellow, status, colorReset)
		default:
			statusStr = fmt.Sprintf("%s🔴 %d ERROR%s", colorRed, status, colorReset)
		}

		// 2. Format Method Color
		method := c.Method()
		var methodStr string
		switch method {
		case "GET":
			methodStr = fmt.Sprintf("%s%s%-6s%s", colorCyan, colorBold, method, colorReset)
		case "POST":
			methodStr = fmt.Sprintf("%s%s%-6s%s", colorGreen, colorBold, method, colorReset)
		case "PUT", "PATCH":
			methodStr = fmt.Sprintf("%s%s%-6s%s", colorYellow, colorBold, method, colorReset)
		case "DELETE":
			methodStr = fmt.Sprintf("%s%s%-6s%s", colorRed, colorBold, method, colorReset)
		default:
			methodStr = fmt.Sprintf("%s%-6s%s", colorBlue, method, colorReset)
		}

		// 3. Format Latency Color (Green < 100ms, Yellow < 500ms, Red > 500ms)
		var latencyStr string
		if latency < 100*time.Millisecond {
			latencyStr = fmt.Sprintf("%s%6v%s", colorGreen, latency.Round(time.Millisecond), colorReset)
		} else if latency < 500*time.Millisecond {
			latencyStr = fmt.Sprintf("%s%6v%s", colorYellow, latency.Round(time.Millisecond), colorReset)
		} else {
			latencyStr = fmt.Sprintf("%s%s%6v%s", colorRed, colorBold, latency.Round(time.Millisecond), colorReset)
		}

		// 4. Extract User Info if Authenticated
		userInfo := ""
		if s, ok := c.Locals(sessionCtxKey).(*domain.SessionContext); ok && s != nil && s.User != nil {
			userInfo = fmt.Sprintf(" %s| User: %s (%s)%s", colorGray, s.User.Email, s.User.Role, colorReset)
		}

		// 5. Extract Error or Route details
		errInfo := ""
		if err != nil {
			errInfo = fmt.Sprintf(" %s| Error: %v%s", colorRed, err, colorReset)
		}

		path := c.OriginalURL()
		if path == "" {
			path = c.Path()
		}

		clientIP := c.IP()
		if clientIP == "::1" || clientIP == "127.0.0.1" {
			clientIP = "localhost"
		}

		timestamp := time.Now().Format("15:04:05")

		// Print clean, unified, enterprise terminal log line
		fmt.Printf(
			"%s[%s]%s %s | %s %-32s | %s | IP: %-9s%s%s\n",
			colorGray, timestamp, colorReset,
			statusStr,
			methodStr, path,
			latencyStr,
			clientIP,
			userInfo,
			errInfo,
		)

		return err
	}
}
