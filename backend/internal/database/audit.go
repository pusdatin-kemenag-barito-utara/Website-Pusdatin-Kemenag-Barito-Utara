package database

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"pusdatin/backend/internal/domain"
)

func (s *Store) ListAuditLogs(ctx context.Context, f domain.AuditFilter) ([]domain.AuditLog, int64, error) {
	where := []string{}
	args := []any{}
	idx := 1

	if f.Action != "" {
		where = append(where, fmt.Sprintf("al.action = $%d", idx))
		args = append(args, f.Action)
		idx++
	}
	if f.TargetSchema != "" {
		where = append(where, fmt.Sprintf("al.target_schema = $%d", idx))
		args = append(args, f.TargetSchema)
		idx++
	}
	if f.StartDate != "" {
		if t, err := time.Parse(time.RFC3339, f.StartDate); err == nil {
			where = append(where, fmt.Sprintf("al.timestamp >= $%d", idx))
			args = append(args, t)
			idx++
		}
	}
	if f.EndDate != "" {
		if t, err := time.Parse(time.RFC3339, f.EndDate); err == nil {
			where = append(where, fmt.Sprintf("al.timestamp <= $%d", idx))
			args = append(args, t)
			idx++
		}
	}
	if f.Search != "" {
		escaped := strings.ReplaceAll(strings.ReplaceAll(f.Search, `\`, `\\`), "%", `\%`)
		where = append(where, fmt.Sprintf("al.target ILIKE $%d ESCAPE '\\'", idx))
		args = append(args, "%"+escaped+"%")
		idx++
	}

	whereSQL := ""
	if len(where) > 0 {
		whereSQL = " WHERE " + strings.Join(where, " AND ")
	}

	var total int64
	if err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM kemenag_pusdatin.audit_logs al`+whereSQL, args...,
	).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `SELECT al.id, al.action, al.target, al.target_schema,
			COALESCE(p.name, al.performed_by) AS performed_by,
			al.before_state, al.after_state, al.ip, al.timestamp
		FROM kemenag_pusdatin.audit_logs al
		LEFT JOIN kemenag_pusdatin.profiles p ON p.id::text = al.performed_by` +
		whereSQL + ` ORDER BY al.timestamp DESC LIMIT $` + fmt.Sprintf("%d", idx) +
		` OFFSET $` + fmt.Sprintf("%d", idx+1)

	args = append(args, f.Limit, f.Offset)
	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	logs := []domain.AuditLog{}
	for rows.Next() {
		var r domain.AuditLog
		var schema, ip *string
		var beforeRaw, afterRaw []byte
		var ts any
		if err := rows.Scan(&r.ID, &r.Action, &r.Target, &schema, &r.PerformedBy,
			&beforeRaw, &afterRaw, &ip, &ts); err != nil {
			return nil, 0, err
		}
		r.TargetSchema = schema
		r.IP = ip
		r.BeforeState = parseMapJSON(beforeRaw)
		r.AfterState = parseMapJSON(afterRaw)
		r.Timestamp = formatTime(asTime(ts))

		if strings.HasPrefix(r.Target, "auth ") {
			r.Target = "Sistem Autentikasi"
		}
		logs = append(logs, r)
	}
	return logs, total, rows.Err()
}

func (s *Store) DeleteAuditLogs(ctx context.Context, targetSchema string) (int64, error) {
	var tag interface{ RowsAffected() int64 }
	var err error
	if targetSchema != "" {
		tag, err = s.pool.Exec(ctx,
			`DELETE FROM kemenag_pusdatin.audit_logs WHERE target_schema = $1`, targetSchema)
	} else {
		tag, err = s.pool.Exec(ctx, `DELETE FROM kemenag_pusdatin.audit_logs`)
	}
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

// InsertAuditLog records an entry and auto-prunes logs older than 30 days.
func (s *Store) InsertAuditLog(ctx context.Context, action, target, targetSchema, performedBy string, before, after any, ip string) error {
	var beforeRaw, afterRaw []byte
	var err error
	if before != nil {
		beforeRaw, err = json.Marshal(before)
		if err != nil {
			return err
		}
	}
	if after != nil {
		afterRaw, err = json.Marshal(after)
		if err != nil {
			return err
		}
	}
	var ipPtr any
	if ip != "" {
		ipPtr = ip
	}
	_, err = s.pool.Exec(ctx, `
		INSERT INTO kemenag_pusdatin.audit_logs
			(action, target, target_schema, performed_by, before_state, after_state, ip)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		action, target, targetSchema, performedBy, beforeRaw, afterRaw, ipPtr)
	if err != nil {
		return err
	}

	// Auto-prune audit logs older than 30 days to keep database performant
	_, _ = s.pool.Exec(ctx, `
		DELETE FROM kemenag_pusdatin.audit_logs
		WHERE timestamp < now() - INTERVAL '30 days'`)

	return nil
}
