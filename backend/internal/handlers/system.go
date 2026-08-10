package handlers

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/load"
	"github.com/shirou/gopsutil/v4/mem"
	"github.com/shirou/gopsutil/v4/net"

	"pusdatin/backend/internal/database"
	"pusdatin/backend/internal/utils"
)

type realtimeMetrics struct {
	CPU      realtimeCPU      `json:"cpu"`
	RAM      realtimeRAM      `json:"ram"`
	Storage  realtimeStorage  `json:"storage"`
	Network  realtimeNetwork  `json:"network"`
	Uptime   uint64           `json:"uptime"`
}

type realtimeCPU struct {
	Load    float64 `json:"load"`
	AvgLoad float64 `json:"avgLoad"`
	Cores   int     `json:"cores"`
}

type realtimeRAM struct {
	Total uint64 `json:"total"`
	Used  uint64 `json:"used"`
	Free  uint64 `json:"free"`
}

type realtimeStorage struct {
	Total uint64 `json:"total"`
	Used  uint64 `json:"used"`
}

type realtimeNetwork struct {
	RxSec float64 `json:"rxSec"`
	TxSec float64 `json:"txSec"`
}

// netRate caches the last counters to compute per-second rates.
type netRate struct {
	mu     sync.Mutex
	recv   uint64
	sent   uint64
	at     time.Time
	ready  bool
}

func (n *netRate) sample() (rx, tx float64) {
	counters, err := net.IOCounters(true)
	if err != nil || len(counters) == 0 {
		return 0, 0
	}
	var recv, sent uint64
	for _, c := range counters {
		if c.BytesRecv > 0 || c.BytesSent > 0 {
			recv += c.BytesRecv
			sent += c.BytesSent
		}
	}
	now := time.Now()
	n.mu.Lock()
	defer n.mu.Unlock()
	if n.ready {
		elapsed := now.Sub(n.at).Seconds()
		if elapsed > 0 {
			rx = float64(recv-n.recv) / elapsed
			tx = float64(sent-n.sent) / elapsed
			if rx < 0 {
				rx = 0
			}
			if tx < 0 {
				tx = 0
			}
		}
	}
	n.recv = recv
	n.sent = sent
	n.at = now
	n.ready = true
	return rx, tx
}

var sharedNetRate = &netRate{}

func collectRealtime() (*realtimeMetrics, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cpuPct, err := cpu.Percent(0, false)
	if err != nil {
		return nil, err
	}
	cpuLoad := 0.0
	if len(cpuPct) > 0 {
		cpuLoad = cpuPct[0]
	}
	cores, _ := cpu.Counts(true)

	avgLoad := 0.0
	if l, err := load.Avg(); err == nil && l != nil {
		avgLoad = l.Load1
	}

	vm, err := mem.VirtualMemory()
	if err != nil {
		return nil, err
	}

	var totalDisk, usedDisk uint64
	if parts, err := disk.Partitions(false); err == nil {
		for _, p := range parts {
			u, err := disk.Usage(p.Mountpoint)
			if err != nil {
				continue
			}
			totalDisk += u.Total
			usedDisk += u.Used
		}
	}

	rxSec, txSec := sharedNetRate.sample()
	uptime, _ := host.Uptime()

	_ = ctx
	return &realtimeMetrics{
		CPU: realtimeCPU{Load: cpuLoad, AvgLoad: avgLoad, Cores: cores},
		RAM: realtimeRAM{Total: vm.Total, Used: vm.Used, Free: vm.Available},
		Storage: realtimeStorage{Total: totalDisk, Used: usedDisk},
		Network: realtimeNetwork{RxSec: rxSec, TxSec: txSec},
		Uptime:  uptime,
	}, nil
}

// RealtimeMetrics returns live VPS metrics (used by /api/system/realtime).
func (h *Handler) RealtimeMetrics(c *fiber.Ctx) error {
	data, err := collectRealtime()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch realtime metrics"})
	}
	return c.JSON(data)
}

// SystemHealth returns the latest persisted snapshot for the dashboard card.
func (h *Handler) SystemHealth(c *fiber.Ctx) error {
	latest, err := h.Store.LatestSystemMetrics(c.Context())
	if err != nil {
		return utils.OK(c, fiber.Map{"cpu": 0, "ram": 0, "storage": 0, "uptime": "N/A"})
	}
	return utils.OK(c, latest)
}

// MonitorMetrics collects and persists a metrics snapshot every interval.
func (h *Handler) MonitorMetrics(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			h.saveSnapshot(context.Background())
		}
	}
}

func (h *Handler) saveSnapshot(ctx context.Context) {
	data, err := collectRealtime()
	if err != nil {
		return
	}
	cpuPct := int(data.CPU.Load)
	ramPct := 0
	if data.RAM.Total > 0 {
		ramPct = int(float64(data.RAM.Used) / float64(data.RAM.Total) * 100)
	}
	storagePct := 0
	if data.Storage.Total > 0 {
		storagePct = int(float64(data.Storage.Used) / float64(data.Storage.Total) * 100)
	}
	uptime := formatUptimeStr(data.Uptime)
	if err := h.Store.SaveSystemMetrics(ctx, database.SystemHealth{
		CPU:     cpuPct,
		RAM:     ramPct,
		Storage: storagePct,
		Uptime:  uptime,
	}); err != nil {
		log.Printf("[MONITOR] failed to save metrics: %v", err)
	}
}

func formatUptimeStr(seconds uint64) string {
	if seconds == 0 {
		return "N/A"
	}
	d := seconds / 86400
	h := (seconds % 86400) / 3600
	m := (seconds % 3600) / 60
	if d > 0 {
		return itoa(d) + "h " + itoa(h) + "j " + itoa(m) + "m"
	}
	return itoa(h) + "j " + itoa(m) + "m"
}

func itoa(n uint64) string {
	if n == 0 {
		return "0"
	}
	var b [20]byte
	i := len(b)
	for n > 0 {
		i--
		b[i] = byte('0' + n%10)
		n /= 10
	}
	return string(b[i:])
}
