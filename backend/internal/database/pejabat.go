package database

import (
	"context"
	"fmt"
	"strings"
)

func (s *Store) ListPejabat(ctx context.Context) ([]*Pejabat, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT u.id, u.name, u.email, pg.nip, pg.jabatan, pg.unit_kerja,
			pg.tipe_pejabat, pg.order_index
		FROM kemenag_pusdatin.profiles_pegawai pg
		INNER JOIN kemenag_pusdatin.profiles u ON pg.user_id = u.id
		WHERE pg.tipe_pejabat IS NOT NULL
		ORDER BY pg.order_index ASC, pg.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []*Pejabat{}
	for rows.Next() {
		var p Pejabat
		var nip, jabatan, unitKerja, tipe *string
		if err := rows.Scan(&p.ID, &p.Nama, &p.Email, &nip, &jabatan, &unitKerja,
			&tipe, &p.OrderIndex); err != nil {
			return nil, err
		}
		p.NIP = nip
		p.Jabatan = jabatan
		p.UnitKerja = unitKerja
		p.TipePejabat = tipe
		result = append(result, &p)
	}
	return result, rows.Err()
}

// SetPejabat (POST /api/pejabat) marks an existing pegawai as pejabat.
func (s *Store) SetPejabat(ctx context.Context, id string, tipePejabat string, orderIndex int, unitKerja *string) (*Pejabat, error) {
	query := `
		UPDATE kemenag_pusdatin.profiles_pegawai
		SET tipe_pejabat = $2, order_index = $3, unit_kerja = COALESCE($4, unit_kerja), updated_at = now()
		WHERE user_id = $1
		RETURNING user_id, tipe_pejabat, order_index, unit_kerja`
	var p Pejabat
	var tipe *string
	var unit *string
	err := s.pool.QueryRow(ctx, query, id, tipePejabat, orderIndex, unitKerja).
		Scan(&p.ID, &tipe, &p.OrderIndex, &unit)
	if err != nil {
		return nil, err
	}
	p.TipePejabat = tipe
	p.UnitKerja = unit
	return &p, nil
}

// UpdatePejabat (PUT /api/pejabat/:id) updates pejabat fields AND fixes the
// old bug where nama/nip/jabatan in the body were silently ignored.
func (s *Store) UpdatePejabat(ctx context.Context, id string, fields map[string]any) (bool, error) {
	if len(fields) == 0 {
		return true, nil
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
	query := `UPDATE kemenag_pusdatin.profiles_pegawai SET ` +
		strings.Join(cols, ", ") + `, updated_at = now()
		WHERE user_id = $` + fmt.Sprintf("%d", idx) + ` AND tipe_pejabat IS NOT NULL`
	tag, err := s.pool.Exec(ctx, query, args...)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

// UpdatePejabatName updates the profile name for a pejabat (part of PUT fix).
func (s *Store) UpdatePejabatName(ctx context.Context, id, nama string) error {
	if nama == "" {
		return nil
	}
	_, err := s.pool.Exec(ctx, `
		UPDATE kemenag_pusdatin.profiles SET name = $2, updated_at = now() WHERE id = $1`, id, nama)
	return err
}

// DeletePejabat (DELETE /api/pejabat/:id) removes the pejabat flag.
func (s *Store) DeletePejabat(ctx context.Context, id string) (bool, error) {
	tag, err := s.pool.Exec(ctx, `
		UPDATE kemenag_pusdatin.profiles_pegawai
		SET tipe_pejabat = NULL, order_index = 0, updated_at = now()
		WHERE user_id = $1 AND tipe_pejabat IS NOT NULL`, id)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}
