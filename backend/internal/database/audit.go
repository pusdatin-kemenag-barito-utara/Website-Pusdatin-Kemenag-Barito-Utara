package database

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"pusdatin/backend/internal/domain"
)

type pbAuditLog struct {
	ID           string         `json:"id"`
	Action       string         `json:"action"`
	Target       string         `json:"target"`
	TargetSchema string         `json:"target_schema"`
	PerformedBy  string         `json:"performed_by"`
	BeforeState  map[string]any `json:"before_state"`
	AfterState   map[string]any `json:"after_state"`
	IP           string         `json:"ip"`
	Timestamp    string         `json:"timestamp"`
	Created      string         `json:"created"`
}

func (p *pbAuditLog) toDomain() domain.AuditLog {
	r := domain.AuditLog{
		ID:          p.ID,
		Action:      p.Action,
		Target:      p.Target,
		PerformedBy: p.PerformedBy,
		BeforeState: p.BeforeState,
		AfterState:  p.AfterState,
	}
	if r.BeforeState == nil {
		r.BeforeState = map[string]any{}
	}
	if r.AfterState == nil {
		r.AfterState = map[string]any{}
	}
	if p.TargetSchema != "" {
		r.TargetSchema = &p.TargetSchema
	}
	if p.IP != "" {
		r.IP = &p.IP
	}
	ts := p.Timestamp
	if ts == "" {
		ts = p.Created
	}
	r.Timestamp = ts

	if strings.HasPrefix(r.Target, "auth ") {
		r.Target = "Sistem Autentikasi"
	}
	return r
}

func (s *Store) ListAuditLogs(ctx context.Context, f domain.AuditFilter) ([]domain.AuditLog, int64, error) {
	filters := []string{}
	if f.Action != "" {
		filters = append(filters, fmt.Sprintf("action = '%s'", strings.ReplaceAll(f.Action, "'", "\\'")))
	}
	if f.TargetSchema != "" {
		filters = append(filters, fmt.Sprintf("target_schema = '%s'", strings.ReplaceAll(f.TargetSchema, "'", "\\'")))
	}
	if f.StartDate != "" {
		filters = append(filters, fmt.Sprintf("timestamp >= '%s'", f.StartDate))
	}
	if f.EndDate != "" {
		filters = append(filters, fmt.Sprintf("timestamp <= '%s'", f.EndDate))
	}
	if f.Search != "" {
		escaped := strings.ReplaceAll(f.Search, "'", "\\'")
		filters = append(filters, fmt.Sprintf("target ~ '%s'", escaped))
	}

	limit := f.Limit
	if limit <= 0 {
		limit = 50
	}
	page := (f.Offset / limit) + 1

	params := url.Values{}
	params.Set("page", fmt.Sprintf("%d", page))
	params.Set("perPage", fmt.Sprintf("%d", limit))
	params.Set("sort", "-timestamp,-created")
	if len(filters) > 0 {
		params.Set("filter", strings.Join(filters, " && "))
	}

	var records []pbAuditLog
	total, err := s.ListRecords(ctx, "audit_logs", params, &records)
	if err != nil {
		return nil, 0, err
	}

	logs := make([]domain.AuditLog, len(records))
	for i := range records {
		logs[i] = records[i].toDomain()
	}
	return logs, total, nil
}

func (s *Store) DeleteAuditLogs(ctx context.Context, targetSchema string) (int64, error) {
	params := url.Values{}
	if targetSchema != "" {
		params.Set("filter", fmt.Sprintf("target_schema = '%s'", targetSchema))
	}
	params.Set("perPage", "500")

	var records []pbAuditLog
	_, err := s.ListRecords(ctx, "audit_logs", params, &records)
	if err != nil {
		return 0, err
	}

	var deleted int64
	for _, r := range records {
		if err := s.DeleteRecord(ctx, "audit_logs", r.ID); err == nil {
			deleted++
		}
	}
	return deleted, nil
}

func (s *Store) DeleteAuditLogsBatch(ctx context.Context, ids []string) (int64, error) {
	var deleted int64
	for _, id := range ids {
		if err := s.DeleteRecord(ctx, "audit_logs", id); err == nil {
			deleted++
		}
	}
	return deleted, nil
}

func (s *Store) InsertAuditLog(ctx context.Context, action, target, targetSchema, performedBy string, before, after any, ip string) error {
	now := time.Now().UTC().Format("2006-01-02 15:04:05.000Z")
	payload := map[string]any{
		"action":        action,
		"target":        target,
		"target_schema": targetSchema,
		"performed_by":  performedBy,
		"before_state":  before,
		"after_state":   after,
		"ip":            ip,
		"timestamp":     now,
	}
	return s.CreateRecord(ctx, "audit_logs", payload, nil)
}
