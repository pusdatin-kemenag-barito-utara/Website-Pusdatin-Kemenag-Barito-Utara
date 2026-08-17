package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"pusdatin/backend/internal/domain"
)

type Factor = domain.Factor
type AuthUser = domain.AuthUser
type TokenResponse = domain.TokenResponse

// Client wraps HTTP access to the Supabase Auth REST API.
type Client struct {
	BaseURL     string
	AnonKey     string
	ServiceRole string
	HTTP        *http.Client
}

func NewClient(baseURL, anonKey, serviceRole string) *Client {
	return &Client{
		BaseURL:     strings.TrimSuffix(baseURL, "/"),
		AnonKey:     anonKey,
		ServiceRole: serviceRole,
		HTTP:        &http.Client{Timeout: 15 * time.Second},
	}
}

// SignInWithPassword exchanges email+password for a session token.
func (c *Client) SignInWithPassword(ctx context.Context, email, password string) (*domain.TokenResponse, error) {
	body, _ := json.Marshal(map[string]string{"email": email, "password": password})
	var out domain.TokenResponse
	resp, err := c.do(ctx, http.MethodPost, "/auth/v1/token?grant_type=password", c.anonHeaders(), bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("supabase sign in failed (%d): %s", resp.StatusCode, truncate(string(data), 200))
	}
	if err := json.Unmarshal(data, &out); err != nil {
		return nil, err
	}
	out.Raw = data
	return &out, nil
}

// GetUser validates an access token and returns the authenticated user.
func (c *Client) GetUser(ctx context.Context, accessToken string) (*domain.AuthUser, error) {
	var out domain.AuthUser
	headers := map[string]string{
		"apikey":        c.AnonKey,
		"Authorization": "Bearer " + accessToken,
		"Content-Type":  "application/json",
	}
	resp, err := c.do(ctx, http.MethodGet, "/auth/v1/user", headers, nil)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("supabase getUser failed (%d): %s", resp.StatusCode, truncate(string(data), 200))
	}
	if err := json.Unmarshal(data, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

// GenerateMagicLink creates a magic link for SSO (admin API).
func (c *Client) GenerateMagicLink(ctx context.Context, email, redirectTo string) (string, error) {
	payload := map[string]any{
		"type":  "magiclink",
		"email": email,
		"options": map[string]string{
			"redirect_to": redirectTo,
		},
	}
	body, _ := json.Marshal(payload)
	var out struct {
		ActionLink string `json:"action_link"`
		Properties struct {
			ActionLink string `json:"action_link"`
		} `json:"properties"`
	}
	resp, err := c.do(ctx, http.MethodPost, "/auth/v1/admin/generate_link", c.serviceHeaders(), bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("generate link failed (%d): %s", resp.StatusCode, truncate(string(data), 200))
	}
	if err := json.Unmarshal(data, &out); err != nil {
		return "", err
	}
	link := out.ActionLink
	if link == "" {
		link = out.Properties.ActionLink
	}
	if link == "" {
		return "", fmt.Errorf("generate link returned no action_link")
	}
	return link, nil
}

// AdminCreateUser creates a user in Supabase Auth and returns the new id.
func (c *Client) AdminCreateUser(ctx context.Context, email, password, name string) (string, error) {
	payload := map[string]any{
		"email":         email,
		"password":      password,
		"email_confirm": true,
		"user_metadata": map[string]string{"full_name": name},
	}
	body, _ := json.Marshal(payload)
	var out struct {
		ID string `json:"id"`
	}
	resp, err := c.do(ctx, http.MethodPost, "/auth/v1/admin/users", c.serviceHeaders(), bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("admin create user failed (%d): %s", resp.StatusCode, truncate(string(data), 200))
	}
	if err := json.Unmarshal(data, &out); err != nil {
		return "", err
	}
	return out.ID, nil
}

// AdminFindUserByEmail returns the auth user id for an email, if present.
func (c *Client) AdminFindUserByEmail(ctx context.Context, email string) (string, error) {
	var out struct {
		Users []struct {
			ID    string `json:"id"`
			Email string `json:"email"`
		} `json:"users"`
	}
	resp, err := c.do(ctx, http.MethodGet, "/auth/v1/admin/users?per_page=1000", c.serviceHeaders(), nil)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("admin list users failed (%d)", resp.StatusCode)
	}
	if err := json.Unmarshal(data, &out); err != nil {
		return "", err
	}
	needle := strings.ToLower(email)
	for _, u := range out.Users {
		if strings.EqualFold(u.Email, needle) {
			return u.ID, nil
		}
	}
	return "", nil
}

// AdminUpdateUser updates a Supabase Auth user.
func (c *Client) AdminUpdateUser(ctx context.Context, id string, payload map[string]any) error {
	body, _ := json.Marshal(payload)
	resp, err := c.do(ctx, http.MethodPut, "/auth/v1/admin/users/"+id, c.serviceHeaders(), bytes.NewReader(body))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("admin update user failed (%d): %s", resp.StatusCode, truncate(string(data), 200))
	}
	return nil
}

// AdminDeleteUser removes a user from Supabase Auth.
func (c *Client) AdminDeleteUser(ctx context.Context, id string) error {
	resp, err := c.do(ctx, http.MethodDelete, "/auth/v1/admin/users/"+id, c.serviceHeaders(), nil)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("admin delete user failed (%d)", resp.StatusCode)
	}
	return nil
}

func (c *Client) anonHeaders() map[string]string {
	return map[string]string{
		"apikey":        c.AnonKey,
		"Authorization": "Bearer " + c.AnonKey,
		"Content-Type":  "application/json",
	}
}

func (c *Client) serviceHeaders() map[string]string {
	return map[string]string{
		"apikey":        c.AnonKey,
		"Authorization": "Bearer " + c.ServiceRole,
		"Content-Type":  "application/json",
	}
}

func (c *Client) do(ctx context.Context, method, path string, headers map[string]string, body io.Reader) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, body)
	if err != nil {
		return nil, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	return c.HTTP.Do(req)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

var _ domain.IdentityProvider = (*Client)(nil)
