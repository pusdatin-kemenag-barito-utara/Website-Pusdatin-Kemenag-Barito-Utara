package services

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/load"
	"github.com/shirou/gopsutil/v4/mem"
	"github.com/shirou/gopsutil/v4/net"

	"pusdatin/backend/internal/domain"
)

type SystemService struct {
	systemRepo   domain.SystemRepository
	netRate      *netRateTracker
	cores        int
	diskMu       sync.RWMutex
	cachedTotal  uint64
	cachedUsed   uint64
	cachedDiskAt time.Time
}

func NewSystemService(systemRepo domain.SystemRepository) *SystemService {
	cores, _ := cpu.Counts(true)
	// Prime initial CPU sample for non-blocking delta calculation
	_, _ = cpu.Percent(0, false)

	return &SystemService{
		systemRepo: systemRepo,
		netRate:    &netRateTracker{},
		cores:      cores,
	}
}

type netRateTracker struct {
	mu    sync.Mutex
	recv  uint64
	sent  uint64
	at    time.Time
	ready bool
}

func (n *netRateTracker) sample() (rx, tx float64) {
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

func (s *SystemService) getDiskUsage(ctx context.Context) (uint64, uint64) {
	s.diskMu.RLock()
	if s.cachedTotal > 0 && time.Since(s.cachedDiskAt) < 30*time.Second {
		tot, used := s.cachedTotal, s.cachedUsed
		s.diskMu.RUnlock()
		return tot, used
	}
	s.diskMu.RUnlock()

	var totalDisk, usedDisk uint64
	if u, err := disk.UsageWithContext(ctx, "/"); err == nil && u.Total > 0 {
		totalDisk = u.Total
		usedDisk = u.Used
	} else if parts, err := disk.PartitionsWithContext(ctx, false); err == nil {
		for _, p := range parts {
			if u, err := disk.UsageWithContext(ctx, p.Mountpoint); err == nil && u.Total > 0 {
				totalDisk += u.Total
				usedDisk += u.Used
			}
		}
	}

	s.diskMu.Lock()
	s.cachedTotal = totalDisk
	s.cachedUsed = usedDisk
	s.cachedDiskAt = time.Now()
	s.diskMu.Unlock()

	return totalDisk, usedDisk
}

func (s *SystemService) CollectRealtime(ctx context.Context) (*domain.RealtimeMetrics, error) {
	// Non-blocking CPU delta calculation (instant 0ms)
	cpuPct, err := cpu.PercentWithContext(ctx, 0, false)
	cpuLoad := 0.0
	if err == nil && len(cpuPct) > 0 {
		cpuLoad = cpuPct[0]
	}

	cores := s.cores
	if cores == 0 {
		cores, _ = cpu.CountsWithContext(ctx, true)
	}

	avgLoad := 0.0
	if l, err := load.AvgWithContext(ctx); err == nil && l != nil {
		avgLoad = l.Load1
	}

	vm, err := mem.VirtualMemoryWithContext(ctx)
	if err != nil {
		return nil, err
	}

	totalDisk, usedDisk := s.getDiskUsage(ctx)
	rxSec, txSec := s.netRate.sample()
	uptime, _ := host.UptimeWithContext(ctx)

	return &domain.RealtimeMetrics{
		CPU:     domain.RealtimeCPU{Load: cpuLoad, AvgLoad: avgLoad, Cores: cores},
		RAM:     domain.RealtimeRAM{Total: vm.Total, Used: vm.Used, Free: vm.Available},
		Storage: domain.RealtimeStorage{Total: totalDisk, Used: usedDisk},
		Network: domain.RealtimeNetwork{RxSec: rxSec, TxSec: txSec},
		Uptime:  uptime,
	}, nil
}

func (s *SystemService) GetLatestHealth(ctx context.Context) (*domain.SystemHealth, error) {
	latest, err := s.systemRepo.LatestSystemMetrics(ctx)
	if err != nil {
		return &domain.SystemHealth{CPU: 0, RAM: 0, Storage: 0, Uptime: "N/A"}, nil
	}
	return latest, nil
}

func (s *SystemService) PingDatabase(ctx context.Context) error {
	return s.systemRepo.Ping(ctx)
}

func (s *SystemService) StartMetricsMonitor(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.saveSnapshot(ctx)
		}
	}
}

func (s *SystemService) saveSnapshot(ctx context.Context) {
	data, err := s.CollectRealtime(ctx)
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
	if err := s.systemRepo.SaveSystemMetrics(ctx, domain.SystemHealth{
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
