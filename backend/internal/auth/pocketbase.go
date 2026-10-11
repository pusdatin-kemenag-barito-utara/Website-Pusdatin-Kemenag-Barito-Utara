package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"pusdatin/backend/internal/domain"
)

type PBClient struct {
	BaseURL       string
	AdminEmail    string
	AdminPassword string
	HTTP          *http.Client

	mu       sync.RWMutex
	token    string
	tokenExp time.Time
}

type Client = PBClient

func NewClient(baseURL, adminEmail, adminPassword string) *PBClient {
	return NewPBClient(baseURL, adminEmail, adminPassword)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

func NewPBClient(baseURL, adminEmail, adminPassword string) *PBClient {
	return &PBClient{
		BaseURL:       strings.TrimRight(baseURL, "/"),
		AdminEmail:    adminEmail,
		AdminPassword: adminPassword,
		HTTP:          &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *PBClient) authenticateAdmin(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	body, err := json.Marshal(map[string]string{
		"identity": c.AdminEmail,
		"password": c.AdminPassword,
	})
	if err != nil {
		return err
	}

	reqURL := c.BaseURL + "/api/collections/_superusers/auth-with-password"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, reqURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("pocketbase admin auth failed (%d): %s", resp.StatusCode, string(b))
	}

	var res struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return err
	}

	c.token = res.Token
	c.tokenExp = time.Now().Add(12 * time.Hour)
	return nil
}

func (c *PBClient) getAdminToken(ctx context.Context) (string, error) {
	c.mu.RLock()
	token := c.token
	expired := time.Now().After(c.tokenExp) || token == ""
	c.mu.RUnlock()

	if expired {
		if err := c.authenticateAdmin(ctx); err != nil {
			return "", err
		}
		c.mu.RLock()
		token = c.token
		c.mu.RUnlock()
	}
	return token, nil
}

// SignInWithPassword exchanges user email+password for a PocketBase session token.
func (c *PBClient) SignInWithPassword(ctx context.Context, email, password string) (*domain.TokenResponse, error) {
	payload, _ := json.Marshal(map[string]string{
		"identity": strings.TrimSpace(email),
		"password": password,
	})

	reqURL := c.BaseURL + "/api/collections/users/auth-with-password"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, reqURL, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("pocketbase sign in failed (%d): %s", resp.StatusCode, truncate(string(data), 200))
	}

	var pbAuthRes struct {
		Token  string `json:"token"`
		Record struct {
			ID    string `json:"id"`
			Email string `json:"email"`
			Name  string `json:"name"`
		} `json:"record"`
	}
	if err := json.Unmarshal(data, &pbAuthRes); err != nil {
		return nil, err
	}

	out := &domain.TokenResponse{
		AccessToken:  pbAuthRes.Token,
		TokenType:    "Bearer",
		ExpiresIn:    432000,
		RefreshToken: pbAuthRes.Token,
		User: &domain.AuthUser{
			ID:    pbAuthRes.Record.ID,
			Email: pbAuthRes.Record.Email,
			UserMetadata: map[string]any{
				"full_name": pbAuthRes.Record.Name,
			},
			Factors: []domain.Factor{},
		},
		Raw: data,
	}
	return out, nil
}

// GetUser validates a token using auth-refresh and returns the authenticated user.
func (c *PBClient) GetUser(ctx context.Context, accessToken string) (*domain.AuthUser, error) {
	reqURL := c.BaseURL + "/api/collections/users/auth-refresh"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, reqURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", accessToken)

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("pocketbase auth validation failed (%d): %s", resp.StatusCode, truncate(string(data), 200))
	}

	var pbAuthRes struct {
		Record struct {
			ID    string `json:"id"`
			Email string `json:"email"`
			Name  string `json:"name"`
		} `json:"record"`
	}
	if err := json.Unmarshal(data, &pbAuthRes); err != nil {
		return nil, err
	}

	return &domain.AuthUser{
		ID:    pbAuthRes.Record.ID,
		Email: pbAuthRes.Record.Email,
		UserMetadata: map[string]any{
			"full_name": pbAuthRes.Record.Name,
		},
		Factors: []domain.Factor{},
	}, nil
}

// GenerateMagicLink triggers password reset email or magic link.
func (c *PBClient) GenerateMagicLink(ctx context.Context, email, redirectTo string) (string, error) {
	payload, _ := json.Marshal(map[string]string{
		"email": email,
	})
	reqURL := c.BaseURL + "/api/collections/users/request-password-reset"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, reqURL, bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("request reset failed (%d): %s", resp.StatusCode, string(b))
	}
	return c.BaseURL + "/_/#/auth/confirm-password-reset", nil
}

// AdminCreateUser creates a user in PocketBase and returns the new ID.
func (c *PBClient) AdminCreateUser(ctx context.Context, email, password, name string) (string, error) {
	adminToken, err := c.getAdminToken(ctx)
	if err != nil {
		return "", err
	}

	payload := map[string]any{
		"email":           email,
		"password":        password,
		"passwordConfirm": password,
		"name":            name,
		"verified":        true,
	}
	body, _ := json.Marshal(payload)

	reqURL := c.BaseURL + "/api/collections/users/records"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, reqURL, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", adminToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	data, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("admin create user failed (%d): %s", resp.StatusCode, truncate(string(data), 200))
	}

	var res struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(data, &res); err != nil {
		return "", err
	}
	return res.ID, nil
}

// AdminFindUserByEmail returns the user ID for an email if found.
func (c *PBClient) AdminFindUserByEmail(ctx context.Context, email string) (string, error) {
	adminToken, err := c.getAdminToken(ctx)
	if err != nil {
		return "", err
	}

	escapedEmail := strings.ReplaceAll(strings.TrimSpace(email), "'", "\\'")
	filter := fmt.Sprintf("email = '%s'", escapedEmail)
	reqURL := fmt.Sprintf("%s/api/collections/users/records?filter=%s&perPage=1", c.BaseURL, url.QueryEscape(filter))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", adminToken)

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return "", fmt.Errorf("admin list users failed (%d)", resp.StatusCode)
	}

	var res struct {
		Items []struct {
			ID    string `json:"id"`
			Email string `json:"email"`
		} `json:"items"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", err
	}

	if len(res.Items) > 0 {
		return res.Items[0].ID, nil
	}
	return "", nil
}

// AdminUpdateUser updates a PocketBase user record.
func (c *PBClient) AdminUpdateUser(ctx context.Context, id string, payload map[string]any) error {
	adminToken, err := c.getAdminToken(ctx)
	if err != nil {
		return err
	}

	body, _ := json.Marshal(payload)
	reqURL := fmt.Sprintf("%s/api/collections/users/records/%s", c.BaseURL, url.PathEscape(id))
	req, err := http.NewRequestWithContext(ctx, http.MethodPatch, reqURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", adminToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("admin update user failed (%d): %s", resp.StatusCode, truncate(string(b), 200))
	}
	return nil
}

// AdminDeleteUser removes a user record from PocketBase.
func (c *PBClient) AdminDeleteUser(ctx context.Context, id string) error {
	adminToken, err := c.getAdminToken(ctx)
	if err != nil {
		return err
	}

	reqURL := fmt.Sprintf("%s/api/collections/users/records/%s", c.BaseURL, url.PathEscape(id))
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, reqURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", adminToken)

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("admin delete user failed (%d)", resp.StatusCode)
	}
	return nil
}

var _ domain.IdentityProvider = (*PBClient)(nil)
