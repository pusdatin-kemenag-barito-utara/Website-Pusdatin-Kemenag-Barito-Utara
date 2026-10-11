package config

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"time"
)

type infisicalAuthResp struct {
	AccessToken string `json:"accessToken"`
}

type infisicalSecretItem struct {
	SecretKey   string `json:"secretKey"`
	SecretValue string `json:"secretValue"`
}

type infisicalSecretsResp struct {
	Secrets []infisicalSecretItem `json:"secrets"`
}

// readMCPConfigFallback reads Universal Auth credentials and Cloudflare credentials from local mcp_config.json if not present in env.
func readMCPConfigFallback() (clientID, clientSecret, cfToken, cfAccount string) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", "", "", ""
	}
	mcpPath := filepath.Join(home, ".gemini", "config", "mcp_config.json")
	data, err := os.ReadFile(mcpPath)
	if err != nil {
		return "", "", "", ""
	}
	data = bytes.TrimPrefix(data, []byte("\xef\xbb\xbf"))

	var mcp struct {
		MCPServers map[string]struct {
			Env map[string]string `json:"env"`
		} `json:"mcpServers"`
	}
	if err := json.Unmarshal(data, &mcp); err != nil {
		return "", "", "", ""
	}

	if inf, ok := mcp.MCPServers["infisical"]; ok {
		clientID = inf.Env["INFISICAL_CLIENT_ID"]
		clientSecret = inf.Env["INFISICAL_CLIENT_SECRET"]
	}
	if cf, ok := mcp.MCPServers["cloudflare-ptsp"]; ok {
		cfToken = cf.Env["CLOUDFLARE_API_TOKEN"]
		cfAccount = cf.Env["CLOUDFLARE_ACCOUNT_ID"]
	}
	return clientID, clientSecret, cfToken, cfAccount
}

// FetchSecretsFromInfisical retrieves real-time secrets from Infisical Cloud API using Universal Auth credentials.
func FetchSecretsFromInfisical(ctx context.Context, env string) (map[string]string, error) {
	apiURL := os.Getenv("INFISICAL_API_URL")
	if apiURL == "" {
		apiURL = "https://app.infisical.com/api"
	}

	clientID := os.Getenv("INFISICAL_CLIENT_ID")
	clientSecret := os.Getenv("INFISICAL_CLIENT_SECRET")
	var fallbackCFToken, fallbackCFAccount string
	if clientID == "" || clientSecret == "" {
		clientID, clientSecret, fallbackCFToken, fallbackCFAccount = readMCPConfigFallback()
	}
	if fallbackCFToken != "" && os.Getenv("CLOUDFLARE_API_TOKEN") == "" {
		_ = os.Setenv("CLOUDFLARE_API_TOKEN", fallbackCFToken)
	}
	if fallbackCFAccount != "" && os.Getenv("CLOUDFLARE_ACCOUNT_ID") == "" {
		_ = os.Setenv("CLOUDFLARE_ACCOUNT_ID", fallbackCFAccount)
	}
	if os.Getenv("CLOUDFLARE_ZONE_ID") == "" {
		_ = os.Setenv("CLOUDFLARE_ZONE_ID", "e0a6e67f46397615609d74d8df864f9f")
	}

	projectID := os.Getenv("INFISICAL_PROJECT_ID")
	if projectID == "" {
		projectID = "ad5be957-3c8a-4c2e-b21e-3838cc3a7c0e"
	}
	// For Pusdatin repository, secret path is always /pusdatin-kemenag
	secretPath := "/pusdatin-kemenag"

	var token string
	client := &http.Client{Timeout: 10 * time.Second}

	// 1. Authenticate with Universal Auth credentials to get a fresh token
	if clientID != "" && clientSecret != "" {
		loginPayload, _ := json.Marshal(map[string]string{
			"clientId":     clientID,
			"clientSecret": clientSecret,
		})
		loginReq, err := http.NewRequestWithContext(ctx, http.MethodPost, apiURL+"/v1/auth/universal-auth/login", bytes.NewReader(loginPayload))
		if err == nil {
			loginReq.Header.Set("Content-Type", "application/json")
			loginResp, err := client.Do(loginReq)
			if err == nil && loginResp.StatusCode == http.StatusOK {
				body, _ := io.ReadAll(loginResp.Body)
				loginResp.Body.Close()
				var authData infisicalAuthResp
				if err := json.Unmarshal(body, &authData); err == nil && authData.AccessToken != "" {
					token = authData.AccessToken
				}
			}
		}
	}

	if token == "" {
		token = os.Getenv("INFISICAL_TOKEN")
	}

	if token == "" {
		return nil, fmt.Errorf("no valid Infisical access token available")
	}

	// 2. Fetch raw secrets
	endpoint := fmt.Sprintf("%s/v3/secrets/raw?environment=%s&workspaceId=%s&secretPath=%s",
		apiURL, env, projectID, url.QueryEscape(secretPath))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("infisical returned status %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	var data infisicalSecretsResp
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, err
	}

	result := make(map[string]string, len(data.Secrets))
	for _, s := range data.Secrets {
		result[s.SecretKey] = s.SecretValue
		// Also update current process env
		_ = os.Setenv(s.SecretKey, s.SecretValue)
	}

	log.Printf("🔒 [Infisical] Berhasil memuat %d secrets langsung dari Infisical Cloud (%s)", len(result), env)
	return result, nil
}
