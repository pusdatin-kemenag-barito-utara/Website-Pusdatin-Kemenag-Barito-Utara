package services

import (
	"context"

	"pusdatin/backend/internal/domain"
)

type PejabatService struct {
	pejabatRepo domain.PejabatRepository
	auditRepo   domain.AuditRepository
}

func NewPejabatService(pejabatRepo domain.PejabatRepository, auditRepo domain.AuditRepository) *PejabatService {
	return &PejabatService{
		pejabatRepo: pejabatRepo,
		auditRepo:   auditRepo,
	}
}

func (s *PejabatService) ListPejabat(ctx context.Context) ([]*domain.Pejabat, error) {
	return s.pejabatRepo.ListPejabat(ctx)
}

func (s *PejabatService) SetPejabat(ctx context.Context, actorEmail, clientIP, id, tipePejabat string, orderIndex int, unitKerja *string) (*domain.Pejabat, error) {
	if id == "" || tipePejabat == "" {
		return nil, domain.ErrInvalidInput
	}

	_, err := s.pejabatRepo.SetPejabat(ctx, id, tipePejabat, orderIndex, unitKerja)
	if err != nil {
		return nil, err
	}

	records, err := s.pejabatRepo.ListPejabat(ctx)
	if err == nil {
		for _, p := range records {
			if p.ID == id {
				_ = s.auditRepo.InsertAuditLog(ctx, "INSERT", "pejabat:"+p.Nama, "kemenag_pusdatin", actorEmail, nil, map[string]any{
					"id": id, "tipePejabat": tipePejabat, "orderIndex": orderIndex,
				}, clientIP)
				return p, nil
			}
		}
	}

	return &domain.Pejabat{
		ID:          id,
		TipePejabat: &tipePejabat,
		OrderIndex:  orderIndex,
		UnitKerja:   unitKerja,
	}, nil
}

func (s *PejabatService) UpdatePejabat(ctx context.Context, actorEmail, clientIP, id string, fields map[string]any, nameUpdate *string) (*domain.Pejabat, error) {
	if nameUpdate != nil && *nameUpdate != "" {
		if err := s.pejabatRepo.UpdatePejabatName(ctx, id, *nameUpdate); err != nil {
			return nil, err
		}
	}

	ok, err := s.pejabatRepo.UpdatePejabat(ctx, id, fields)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, domain.ErrNotFound
	}

	updated, _ := s.pejabatRepo.ListPejabat(ctx)
	for _, p := range updated {
		if p.ID == id {
			_ = s.auditRepo.InsertAuditLog(ctx, "UPDATE", "pejabat:"+p.Nama, "kemenag_pusdatin", actorEmail, nil, map[string]any{
				"id": id, "tipePejabat": p.TipePejabat, "orderIndex": p.OrderIndex, "unitKerja": p.UnitKerja,
			}, clientIP)
			return p, nil
		}
	}
	return nil, nil
}

func (s *PejabatService) DeletePejabat(ctx context.Context, actorEmail, clientIP, id string) error {
	ok, err := s.pejabatRepo.DeletePejabat(ctx, id)
	if err != nil {
		return err
	}
	if !ok {
		return domain.ErrNotFound
	}
	_ = s.auditRepo.InsertAuditLog(ctx, "DELETE", "pejabat:"+id, "kemenag_pusdatin", actorEmail, map[string]any{"id": id}, nil, clientIP)
	return nil
}
