package database

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

type ListResult struct {
	Page       int             `json:"page"`
	PerPage    int             `json:"perPage"`
	TotalItems int64           `json:"totalItems"`
	TotalPages int             `json:"totalPages"`
	Items      json.RawMessage `json:"items"`
}

type Store struct {
	BaseURL       string
	AdminEmail    string
	AdminPassword string
	Client        *http.Client

	mu       sync.RWMutex
	token    string
	tokenExp time.Time
}

// NewStore initializes a new Store connecting to PocketBase.
func NewStore(baseURL, adminEmail, adminPassword string) (*Store, error) {
	baseURL = strings.TrimRight(baseURL, "/")
	if baseURL == "" {
		return nil, fmt.Errorf("pocketbase URL is required")
	}

	s := &Store{
		BaseURL:       baseURL,
		AdminEmail:    adminEmail,
		AdminPassword: adminPassword,
		Client: &http.Client{
			Timeout: 20 * time.Second,
			Transport: &http.Transport{
				MaxIdleConns:        50,
				MaxIdleConnsPerHost: 20,
				IdleConnTimeout:     90 * time.Second,
			},
		},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := s.Authenticate(ctx); err != nil {
		return nil, fmt.Errorf("pocketbase auth error: %w", err)
	}

	log.Printf("✅ Berhasil terhubung ke PocketBase (%s) sebagai superuser", baseURL)
	return s, nil
}

// Authenticate obtains or refreshes the superuser JWT token.
func (s *Store) Authenticate(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	body, err := json.Marshal(map[string]string{
		"identity": s.AdminEmail,
		"password": s.AdminPassword,
	})
	if err != nil {
		return err
	}

	reqURL := s.BaseURL + "/api/collections/_superusers/auth-with-password"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, reqURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.Client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("pocketbase auth failed (%d): %s", resp.StatusCode, string(b))
	}

	var res struct {
		Token string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return err
	}

	s.token = res.Token
	// PocketBase admin tokens are usually valid for 14 days, refresh every 12 hours
	s.tokenExp = time.Now().Add(12 * time.Hour)
	return nil
}

func (s *Store) getToken(ctx context.Context) (string, error) {
	s.mu.RLock()
	token := s.token
	expired := time.Now().After(s.tokenExp) || token == ""
	s.mu.RUnlock()

	if expired {
		if err := s.Authenticate(ctx); err != nil {
			return "", err
		}
		s.mu.RLock()
		token = s.token
		s.mu.RUnlock()
	}
	return token, nil
}

func (s *Store) DoRequest(ctx context.Context, method, path string, body any, out any) error {
	token, err := s.getToken(ctx)
	if err != nil {
		return err
	}

	var bodyReader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		bodyReader = bytes.NewReader(b)
	}

	reqURL := s.BaseURL + path
	req, err := http.NewRequestWithContext(ctx, method, reqURL, bodyReader)
	if err != nil {
		return err
	}
	if token != "" {
		req.Header.Set("Authorization", token)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := s.Client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("pocketbase request %s %s failed (%d): %s", method, path, resp.StatusCode, string(b))
	}

	if out != nil && resp.StatusCode != http.StatusNoContent {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	return nil
}

func (s *Store) GetRecord(ctx context.Context, collection, id string, out any) error {
	path := fmt.Sprintf("/api/collections/%s/records/%s", url.PathEscape(collection), url.PathEscape(id))
	return s.DoRequest(ctx, http.MethodGet, path, nil, out)
}

func (s *Store) ListRecords(ctx context.Context, collection string, params url.Values, out any) (int64, error) {
	path := fmt.Sprintf("/api/collections/%s/records", url.PathEscape(collection))
	if len(params) > 0 {
		path += "?" + params.Encode()
	}

	var res ListResult
	if err := s.DoRequest(ctx, http.MethodGet, path, nil, &res); err != nil {
		return 0, err
	}

	if out != nil && len(res.Items) > 0 {
		if err := json.Unmarshal(res.Items, out); err != nil {
			return res.TotalItems, err
		}
	}
	return res.TotalItems, nil
}

func (s *Store) CreateRecord(ctx context.Context, collection string, data any, out any) error {
	path := fmt.Sprintf("/api/collections/%s/records", url.PathEscape(collection))
	return s.DoRequest(ctx, http.MethodPost, path, data, out)
}

func (s *Store) UpdateRecord(ctx context.Context, collection, id string, data any, out any) error {
	path := fmt.Sprintf("/api/collections/%s/records/%s", url.PathEscape(collection), url.PathEscape(id))
	return s.DoRequest(ctx, http.MethodPatch, path, data, out)
}

func (s *Store) DeleteRecord(ctx context.Context, collection, id string) error {
	path := fmt.Sprintf("/api/collections/%s/records/%s", url.PathEscape(collection), url.PathEscape(id))
	return s.DoRequest(ctx, http.MethodDelete, path, nil, nil)
}

func (s *Store) Ping(ctx context.Context) error {
	reqURL := s.BaseURL + "/api/health"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return err
	}
	resp, err := s.Client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("pocketbase ping health status: %d", resp.StatusCode)
	}
	return nil
}

func formatTime(t time.Time) string {
	return t.UTC().Format("2006-01-02T15:04:05.000Z")
}
