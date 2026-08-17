package domain

import (
	"context"
)

// Factor represents an MFA factor from the identity provider.
type Factor struct {
	ID         string `json:"id"`
	FactorType string `json:"factor_type"`
	Status     string `json:"status"`
}

// AuthUser represents an authenticated user from the identity provider.
type AuthUser struct {
	ID           string         `json:"id"`
	Email        string         `json:"email"`
	AppMetadata  map[string]any `json:"app_metadata"`
	UserMetadata map[string]any `json:"user_metadata"`
	Factors      []Factor       `json:"factors"`
}

// TokenResponse represents the authentication token exchange output.
type TokenResponse struct {
	AccessToken  string    `json:"access_token"`
	TokenType    string    `json:"token_type"`
	ExpiresIn    int       `json:"expires_in"`
	RefreshToken string    `json:"refresh_token"`
	User         *AuthUser `json:"user"`
	Raw          []byte    `json:"-"`
}

// SessionUser is the resolved user profile in HTTP request context.
type SessionUser struct {
	ID             string          `json:"id"`
	Email          string          `json:"email"`
	Name           string          `json:"name"`
	Role           string          `json:"role"`
	AppPermissions []AppPermission `json:"appPermissions"`
}

// SessionContext represents the request-scoped authentication state.
type SessionContext struct {
	User            *SessionUser
	IsAuthenticated bool
	IsAdmin         bool
}

// IdentityProvider abstracts identity management services (e.g. Supabase Auth).
type IdentityProvider interface {
	SignInWithPassword(ctx context.Context, email, password string) (*TokenResponse, error)
	GetUser(ctx context.Context, accessToken string) (*AuthUser, error)
	GenerateMagicLink(ctx context.Context, email, redirectTo string) (string, error)
	AdminCreateUser(ctx context.Context, email, password, name string) (string, error)
	AdminFindUserByEmail(ctx context.Context, email string) (string, error)
	AdminUpdateUser(ctx context.Context, id string, payload map[string]any) error
	AdminDeleteUser(ctx context.Context, id string) error
}

// TurnstileVerifier abstracts Cloudflare Turnstile CAPTCHA validation.
type TurnstileVerifier interface {
	Verify(ctx context.Context, secret, token string, isProduction bool) bool
}
