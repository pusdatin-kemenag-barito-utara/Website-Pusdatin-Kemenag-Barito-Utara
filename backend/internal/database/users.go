package database

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

const userSelectCols = `
	u.id, u.name, u.email, u.role, u.user_type, u.status, u.avatar,
	pg.nip, pg.jabatan, pg.pangkat_golongan, pg.unit_kerja,
	COALESCE(pm.no_hp, u.phone) AS no_hp,
	COALESCE(pm.alamat, u.address) AS alamat,
	NULL::text AS nik, NULL::text AS pekerjaan,
	u.created_at, u.updated_at`

// ListUsers returns users with the given filters. userTypeFilter and appIDFilter are
// combined with AND (fixes the previous .where() overwrite bug). Search is applied
// in memory over name/email (case-insensitive), matching the old backend behavior.
func (s *Store) ListUsers(ctx context.Context, userType string, appID string, search string) ([]*User, error) {
	where := []string{}
	args := []any{}
	paramIdx := 1

	if userType != "" {
		where = append(where, fmt.Sprintf("u.user_type = $%d", paramIdx))
		args = append(args, userType)
		paramIdx++
	}
	if appID != "" {
		where = append(where,
			fmt.Sprintf(`EXISTS (SELECT 1 FROM kemenag_pusdatin.app_permissions ap
				WHERE ap.user_id = u.id AND ap.app_id = $%d AND ap.role <> 'none')`, paramIdx))
		args = append(args, appID)
		paramIdx++
	}

	query := `SELECT ` + userSelectCols + `
		FROM kemenag_pusdatin.profiles u
		LEFT JOIN kemenag_pusdatin.profiles_pegawai pg ON u.id = pg.user_id
		LEFT JOIN kemenag_pusdatin.profiles_pemohon pm ON u.id = pm.user_id`
	if len(where) > 0 {
		query += " WHERE " + strings.Join(where, " AND ")
	}
	query += " ORDER BY u.created_at DESC"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []*User{}
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if search != "" {
		needle := strings.ToLower(search)
		filtered := users[:0]
		for _, u := range users {
			if strings.Contains(strings.ToLower(u.Name), needle) ||
				strings.Contains(strings.ToLower(u.Email), needle) {
				filtered = append(filtered, u)
			}
		}
		users = filtered
	}

	return users, nil
}

func (s *Store) GetUser(ctx context.Context, id string) (*User, error) {
	query := `SELECT ` + userSelectCols + `
		FROM kemenag_pusdatin.profiles u
		LEFT JOIN kemenag_pusdatin.profiles_pegawai pg ON u.id = pg.user_id
		LEFT JOIN kemenag_pusdatin.profiles_pemohon pm ON u.id = pm.user_id
		WHERE u.id = $1 LIMIT 1`

	rows, err := s.pool.Query(ctx, query, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	if !rows.Next() {
		return nil, pgx.ErrNoRows
	}
	return scanUser(rows)
}

// GetUserByEmail is used for session context resolution (profiles.id may differ
// from Supabase auth user id in legacy rows).
func (s *Store) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	query := `SELECT ` + userSelectCols + `
		FROM kemenag_pusdatin.profiles u
		LEFT JOIN kemenag_pusdatin.profiles_pegawai pg ON u.id = pg.user_id
		LEFT JOIN kemenag_pusdatin.profiles_pemohon pm ON u.id = pm.user_id
		WHERE LOWER(u.email) = LOWER($1) LIMIT 1`
	rows, err := s.pool.Query(ctx, query, email)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	if !rows.Next() {
		return nil, pgx.ErrNoRows
	}
	return scanUser(rows)
}

// GetUserRole returns the role (and status) for a profile id.
func (s *Store) GetUserRole(ctx context.Context, id string) (role string, status string, err error) {
	err = s.pool.QueryRow(ctx,
		`SELECT role, status FROM kemenag_pusdatin.profiles WHERE id = $1`, id,
	).Scan(&role, &status)
	return
}

func (s *Store) GetUserPermissions(ctx context.Context, userID string) ([]AppPermission, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT ap.app_id, ap.role, COALESCE(sa.name, ''), ap.features
		FROM kemenag_pusdatin.app_permissions ap
		LEFT JOIN kemenag_pusdatin.satellite_apps sa ON ap.app_id = sa.id
		WHERE ap.user_id = $1`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanPermissions(rows)
}

func (s *Store) ListPermissionsForUsers(ctx context.Context, userIDs []string) (map[string][]AppPermission, error) {
	result := map[string][]AppPermission{}
	if len(userIDs) == 0 {
		return result, nil
	}
	rows, err := s.pool.Query(ctx, `
		SELECT ap.user_id, ap.app_id, ap.role, COALESCE(sa.name, ''), ap.features
		FROM kemenag_pusdatin.app_permissions ap
		LEFT JOIN kemenag_pusdatin.satellite_apps sa ON ap.app_id = sa.id
		WHERE ap.user_id = ANY($1)`, userIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var userID string
		var p AppPermission
		var featuresRaw []byte
		if err := rows.Scan(&userID, &p.AppID, &p.Role, &p.AppName, &featuresRaw); err != nil {
			return nil, err
		}
		p.Features = parseSliceJSON(featuresRaw)
		result[userID] = append(result[userID], p)
	}
	return result, rows.Err()
}

type pgxRow interface {
	Scan(dest ...any) error
}

func scanUser(row pgxRow) (*User, error) {
	var u User
	var avatar, nip, jabatan, pangkat, unitKerja, noHp, alamat, nik, pekerjaan *string
	var createdAt, updatedAt any

	if err := row.Scan(
		&u.ID, &u.Name, &u.Email, &u.Role, &u.UserType, &u.Status,
		&avatar, &nip, &jabatan, &pangkat, &unitKerja, &noHp, &alamat, &nik, &pekerjaan,
		&createdAt, &updatedAt,
	); err != nil {
		return nil, err
	}
	u.Avatar = avatar
	u.NIP = nip
	u.Jabatan = jabatan
	u.PangkatGolongan = pangkat
	u.UnitKerja = unitKerja
	u.NoHP = noHp
	u.Alamat = alamat
	u.NIK = nik
	u.Pekerjaan = pekerjaan
	u.CreatedAt = formatTime(asTime(createdAt))
	u.UpdatedAt = formatTime(asTime(updatedAt))
	u.AppPermissions = []AppPermission{}
	return &u, nil
}

func scanPermissions(rows pgx.Rows) ([]AppPermission, error) {
	result := []AppPermission{}
	for rows.Next() {
		var p AppPermission
		var featuresRaw []byte
		if err := rows.Scan(&p.AppID, &p.Role, &p.AppName, &featuresRaw); err != nil {
			return nil, err
		}
		p.Features = parseSliceJSON(featuresRaw)
		result = append(result, p)
	}
	return result, rows.Err()
}

// UserExistsForApp returns whether a profile with the given email exists.
func (s *Store) UserExistsByEmail(ctx context.Context, email string) (bool, error) {
	var exists bool
	err := s.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM kemenag_pusdatin.profiles WHERE LOWER(email) = LOWER($1))`,
		email).Scan(&exists)
	return exists, err
}

// CreateUser inserts a profile. Returns the created id.
func (s *Store) CreateUser(ctx context.Context, id, name, email, role, userType, status string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO kemenag_pusdatin.profiles (id, name, email, role, user_type, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO NOTHING`,
		id, name, email, role, userType, status)
	return err
}

func (s *Store) UpsertPegawai(ctx context.Context, profileID, nip, jabatan, unitKerja string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO kemenag_pusdatin.profiles_pegawai (user_id, nip, jabatan, unit_kerja)
		VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), NULLIF($4, ''))
		ON CONFLICT (user_id) DO UPDATE SET
			nip = EXCLUDED.nip, jabatan = EXCLUDED.jabatan,
			unit_kerja = EXCLUDED.unit_kerja, updated_at = now()`,
		profileID, nip, jabatan, unitKerja)
	return err
}

func (s *Store) UpdatePegawai(ctx context.Context, profileID, nip, jabatan, unitKerja string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE kemenag_pusdatin.profiles_pegawai
		SET nip = COALESCE(NULLIF($2, ''), nip),
			jabatan = COALESCE(NULLIF($3, ''), jabatan),
			unit_kerja = COALESCE(NULLIF($4, ''), unit_kerja),
			updated_at = now()
		WHERE user_id = $1`, profileID, nip, jabatan, unitKerja)
	return err
}

func (s *Store) UpsertPemohon(ctx context.Context, profileID, noHp, alamat, nik, pekerjaan string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO kemenag_pusdatin.profiles_pemohon (user_id, no_hp, alamat)
		VALUES ($1, NULLIF($2, ''), NULLIF($3, ''))
		ON CONFLICT (user_id) DO UPDATE SET
			no_hp = EXCLUDED.no_hp, alamat = EXCLUDED.alamat, updated_at = now()`,
		profileID, noHp, alamat)
	return err
}

// UpdateUser updates arbitrary profile columns (only non-nil fields).
func (s *Store) UpdateUser(ctx context.Context, id string, fields map[string]any) error {
	if len(fields) == 0 {
		return nil
	}
	cols := []string{}
	args := []any{}
	idx := 1
	for k, v := range fields {
		cols = append(cols, fmt.Sprintf("%s = $%d", k, idx))
		args = append(args, v)
		idx++
	}
	args = append(args, id)
	query := fmt.Sprintf(`UPDATE kemenag_pusdatin.profiles SET %s, updated_at = now() WHERE id = $%d`,
		strings.Join(cols, ", "), idx)
	_, err := s.pool.Exec(ctx, query, args...)
	return err
}

func (s *Store) ReplacePermissions(ctx context.Context, userID string, perms []AppPermission) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx,
		`DELETE FROM kemenag_pusdatin.app_permissions WHERE user_id = $1`, userID); err != nil {
		return err
	}
	for _, p := range perms {
		featJSON, _ := marshalFeatures(p.Features)
		if _, err := tx.Exec(ctx, `
			INSERT INTO kemenag_pusdatin.app_permissions (user_id, app_id, role, features)
			VALUES ($1, $2, $3, $4)`,
			userID, p.AppID, p.Role, featJSON); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (s *Store) DeleteUser(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM kemenag_pusdatin.profiles WHERE id = $1`, id)
	return err
}

// SyncSuratPengguna upserts/deactivates a user inside the satellite kemenag_surat schema.
func (s *Store) SyncSuratPengguna(ctx context.Context, id, nama string, active bool) error {
	if active {
		_, err := s.pool.Exec(ctx, `
			INSERT INTO kemenag_surat.pengguna (id, nama, is_active, created_at, updated_at)
			VALUES ($1, $2, true, now(), now())
			ON CONFLICT (id) DO UPDATE SET
				nama = EXCLUDED.nama, is_active = true, updated_at = now()`, id, nama)
		return err
	}
	_, err := s.pool.Exec(ctx, `
		UPDATE kemenag_surat.pengguna SET is_active = false, updated_at = now() WHERE id = $1`, id)
	return err
}

func (s *Store) DeleteSuratPengguna(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM kemenag_surat.pengguna WHERE id = $1`, id)
	return err
}

// NullifyPTSPReferences nulls out FK references to a deleted user in PTSP tables.
func (s *Store) NullifyPTSPReferences(ctx context.Context, id string) {
	_, _ = s.pool.Exec(ctx,
		`UPDATE kemenag_pusdatin.ptsp_activity_logs SET actor_id = NULL WHERE actor_id = $1`, id)
	_, _ = s.pool.Exec(ctx,
		`UPDATE kemenag_ptsp.ptsp_generated_documents SET generated_by = NULL WHERE generated_by = $1`, id)
}
