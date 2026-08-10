package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"

	"pusdatin/backend/internal/utils"
)

// R2Buckets mirrors the old /api/r2/buckets route (Cloudflare REST API).
func (h *Handler) R2Buckets(c *fiber.Ctx) error {
	if h.Cfg.CloudflareAccountID == "" || h.Cfg.CloudflareAPIToken == "" {
		return utils.Internal(c, "Cloudflare credentials not configured")
	}

	client := &http.Client{Timeout: 15 * time.Second}
	base := "https://api.cloudflare.com/client/v4/accounts/" + h.Cfg.CloudflareAccountID + "/r2/buckets"

	authHeaders := map[string]string{
		"Authorization": "Bearer " + h.Cfg.CloudflareAPIToken,
		"Content-Type":  "application/json",
	}

	listResp, err := httpGetJSON(client, base, authHeaders)
	if err != nil {
		return utils.Internal(c, "Failed to fetch R2 data")
	}
	var listData struct {
		Success bool `json:"success"`
		Result  struct {
			Buckets []map[string]any `json:"buckets"`
		} `json:"result"`
	}
	if err := json.Unmarshal(listResp, &listData); err != nil || !listData.Success {
		return utils.Internal(c, "Failed to fetch R2 data")
	}
	buckets := listData.Result.Buckets
	if buckets == nil {
		buckets = []map[string]any{}
	}

	fallbackUsage := map[string]any{"payloadSize": 0, "metadataSize": 0, "objectCount": 0, "uploadCount": 0}

	type bucketWithUsage struct {
		Bucket map[string]any `json:"-"`
		Usage  map[string]any `json:"usage"`
	}

	var wg sync.WaitGroup
	out := make([]map[string]any, len(buckets))
	for i, bucket := range buckets {
		wg.Add(1)
		go func(i int, bucket map[string]any) {
			defer wg.Done()
			name, _ := bucket["name"].(string)
			usage := fallbackUsage
			if name != "" {
				usageResp, err := httpGetJSON(client, base+"/"+name+"/usage", authHeaders)
				if err == nil {
					var usageData struct {
						Success bool           `json:"success"`
						Result  map[string]any `json:"result"`
					}
					if json.Unmarshal(usageResp, &usageData) == nil && usageData.Success && usageData.Result != nil {
						usage = usageData.Result
					}
				}
			}
			merged := map[string]any{}
			for k, v := range bucket {
				merged[k] = v
			}
			merged["usage"] = usage
			out[i] = merged
		}(i, bucket)
	}
	wg.Wait()

	return c.JSON(fiber.Map{"success": true, "buckets": out})
}

func httpGetJSON(client *http.Client, url string, headers map[string]string) ([]byte, error) {
	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("status %d", resp.StatusCode)
	}
	return body, nil
}
