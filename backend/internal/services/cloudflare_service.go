package services

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

	"pusdatin/backend/internal/config"
	"pusdatin/backend/internal/domain"
)

// CloudflareService manages edge-level maintenance redirection rules via Cloudflare Rulesets API.
type CloudflareService struct {
	cfg    *config.Config
	client *http.Client
	mu     sync.Mutex
}

// NewCloudflareService initializes a new CloudflareService.
func NewCloudflareService(cfg *config.Config) *CloudflareService {
	return &CloudflareService{
		cfg: cfg,
		client: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

// CFRule represents a Cloudflare dynamic redirect rule.
type CFRule struct {
	ID               string           `json:"id,omitempty"`
	Description      string           `json:"description"`
	Expression       string           `json:"expression"`
	Action           string           `json:"action"`
	ActionParameters CFActionParams   `json:"action_parameters"`
	Enabled          bool             `json:"enabled"`
}

type CFActionParams struct {
	FromValue CFFromValue `json:"from_value"`
}

type CFFromValue struct {
	TargetURL           CFTargetURL `json:"target_url"`
	StatusCode          int         `json:"status_code"`
	PreserveQueryString bool        `json:"preserve_query_string"`
}

type CFTargetURL struct {
	Value string `json:"value"`
}

type CFRulesetResponse struct {
	Result struct {
		ID    string   `json:"id"`
		Rules []CFRule `json:"rules"`
	} `json:"result"`
	Success bool `json:"success"`
	Errors  []struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"errors"`
}

// ExtractHost safely extracts the hostname from an application URL.
func ExtractHost(rawURL string) string {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return ""
	}
	if !strings.HasPrefix(rawURL, "http://") && !strings.HasPrefix(rawURL, "https://") {
		rawURL = "https://" + rawURL
	}
	u, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}
	return strings.ToLower(u.Hostname())
}

// IsCloudflareManaged checks if a hostname is under our Cloudflare zone.
func (s *CloudflareService) IsCloudflareManaged(host string) bool {
	if host == "" {
		return false
	}
	// Exclude pusdatin itself and foreign domains (e.g. baritoutara.kemenag.go.id)
	if host == "pusdatin.kemenag-baritoutara.com" {
		return false
	}
	return strings.HasSuffix(host, "kemenag-baritoutara.com")
}

// getRulesetURL returns the Cloudflare API entrypoint URL for dynamic redirects.
func (s *CloudflareService) getRulesetURL() string {
	return fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/rulesets/phases/http_request_dynamic_redirect/entrypoint", s.cfg.CloudflareZoneID)
}

// fetchCurrentRules retrieves the active redirect rules from Cloudflare.
func (s *CloudflareService) fetchCurrentRules(ctx context.Context) ([]CFRule, error) {
	if s.cfg.CloudflareZoneID == "" || s.cfg.CloudflareAPIToken == "" {
		return nil, fmt.Errorf("cloudflare credentials not configured")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.getRulesetURL(), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+s.cfg.CloudflareAPIToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return []CFRule{}, nil
	}

	body, _ := io.ReadAll(resp.Body)
	var cfResp CFRulesetResponse
	if err := json.Unmarshal(body, &cfResp); err != nil {
		return nil, err
	}

	if !cfResp.Success && len(cfResp.Errors) > 0 {
		return nil, fmt.Errorf("cloudflare API error: %s (code %d)", cfResp.Errors[0].Message, cfResp.Errors[0].Code)
	}

	return cfResp.Result.Rules, nil
}

// saveRules writes the complete ruleset to Cloudflare.
func (s *CloudflareService) saveRules(ctx context.Context, rules []CFRule) error {
	payload, err := json.Marshal(map[string]any{
		"rules": rules,
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, s.getRulesetURL(), bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+s.cfg.CloudflareAPIToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var cfResp CFRulesetResponse
	if err := json.Unmarshal(body, &cfResp); err != nil {
		return err
	}

	if !cfResp.Success && len(cfResp.Errors) > 0 {
		return fmt.Errorf("cloudflare update failed: %s", cfResp.Errors[0].Message)
	}

	return nil
}

// SyncAppMaintenance enables or disables Cloudflare redirect rule for a specific app.
func (s *CloudflareService) SyncAppMaintenance(ctx context.Context, appHost, appName string, isMaintenance bool) error {
	if !s.IsCloudflareManaged(appHost) {
		log.Printf("ℹ️ [Cloudflare] Host '%s' bukan domain kelolaan Cloudflare kemenag-baritoutara.com, dilewati.", appHost)
		return nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	currentRules, err := s.fetchCurrentRules(ctx)
	if err != nil {
		log.Printf("⚠️ [Cloudflare] Gagal membaca ruleset Cloudflare: %v", err)
		return err
	}

	// Filter out any rule that targets this host
	targetExpr := fmt.Sprintf(`(http.host eq "%s")`, appHost)
	filteredRules := make([]CFRule, 0, len(currentRules))
	for _, r := range currentRules {
		if r.Expression != targetExpr && !strings.Contains(r.Description, appHost) {
			filteredRules = append(filteredRules, r)
		}
	}

	// If entering maintenance, append a 302 redirect rule to Pusdatin maintenance page
	if isMaintenance {
		redirectURL := fmt.Sprintf("https://pusdatin.kemenag-baritoutara.com/maintenance?app=%s", url.QueryEscape(appName))
		newRule := CFRule{
			Description: fmt.Sprintf("Maintenance: %s", appHost),
			Expression:  targetExpr,
			Action:      "redirect",
			ActionParameters: CFActionParams{
				FromValue: CFFromValue{
					TargetURL: CFTargetURL{
						Value: redirectURL,
					},
					StatusCode:          302,
					PreserveQueryString: false,
				},
			},
			Enabled: true,
		}
		filteredRules = append(filteredRules, newRule)
		log.Printf("🛡️ [Cloudflare] Mengaktifkan Maintenance Redirect untuk %s ➔ %s", appHost, redirectURL)
	} else {
		log.Printf("✅ [Cloudflare] Menonaktifkan Maintenance Redirect untuk %s (Online)", appHost)
	}

	return s.saveRules(ctx, filteredRules)
}

// SyncBulkMaintenance applies maintenance or online status to all Cloudflare-managed apps in a single API call.
func (s *CloudflareService) SyncBulkMaintenance(ctx context.Context, apps []*domain.App, status string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	isMaintenance := status == "maintenance"
	rules := make([]CFRule, 0)

	if isMaintenance {
		for _, a := range apps {
			if a == nil || a.URL == nil {
				continue
			}
			host := ExtractHost(*a.URL)
			if !s.IsCloudflareManaged(host) {
				continue
			}

			redirectURL := fmt.Sprintf("https://pusdatin.kemenag-baritoutara.com/maintenance?app=%s", url.QueryEscape(a.Name))
			rules = append(rules, CFRule{
				Description: fmt.Sprintf("Maintenance: %s", host),
				Expression:  fmt.Sprintf(`(http.host eq "%s")`, host),
				Action:      "redirect",
				ActionParameters: CFActionParams{
					FromValue: CFFromValue{
						TargetURL: CFTargetURL{
							Value: redirectURL,
						},
						StatusCode:          302,
						PreserveQueryString: false,
					},
				},
				Enabled: true,
			})
		}
		log.Printf("🛡️ [Cloudflare] Mengaktifkan %d aturan Maintenance Redirect massal", len(rules))
	} else {
		log.Printf("✅ [Cloudflare] Membersihkan seluruh aturan Maintenance Redirect (Semua Online)")
	}

	return s.saveRules(ctx, rules)
}

// SyncWebsiteDatabase handles database-level sync for baritoutara.kemenag.go.id.
func (s *CloudflareService) SyncWebsiteDatabase(ctx context.Context, targetDBURL, adminEmail, adminPass, status string) error {
	if targetDBURL == "" || adminEmail == "" || adminPass == "" {
		return nil
	}

	targetDBURL = strings.TrimRight(targetDBURL, "/")
	authURL := targetDBURL + "/api/collections/_superusers/auth-with-password"
	authBody, _ := json.Marshal(map[string]string{
		"identity": adminEmail,
		"password": adminPass,
	})

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, authURL, bytes.NewReader(authBody))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.client.Do(req)
	if err != nil {
		log.Printf("ℹ️ [WebsiteSync] Tidak dapat terhubung ke DB website (%s): %v", targetDBURL, err)
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("ℹ️ [WebsiteSync] Autentikasi superuser ke DB website (%s) ditolak (status %d)", targetDBURL, resp.StatusCode)
		return nil
	}

	log.Printf("✅ [WebsiteSync] Berhasil sinkronisasi status '%s' ke PocketBase %s", status, targetDBURL)
	return nil
}
