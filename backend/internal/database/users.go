package database

import (
	"context"

	"github.com/jackc/pgx/v5"
)

const userSelectCols = `
	u.id, u.name, u.email, u.role, u.user_type, u.status, u.avatar,
	NULL::text AS nip, NULL::text AS jabatan, NULL::text AS pangkat_golongan, NULL::text AS unit_kerja,
	u.phone AS no_hp,
	u.address AS alamat,
	NULL::text AS nik, NULL::text AS pekerjaan,
	u.created_at, u.updated_at`

func (s *Store) GetUser(ctx context.Context, id string) (*User, error) {
	query := `SELECT ` + userSelectCols + `
		FROM kemenag_pusdatin.profiles u
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

// GetUserByEmail is used for session context resolution.
func (s *Store) GetUserByEmail(ctx context.Context, email string) (*User, error) {
	query := `SELECT ` + userSelectCols + `
		FROM kemenag_pusdatin.profiles u
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
	return []AppPermission{}, nil
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
