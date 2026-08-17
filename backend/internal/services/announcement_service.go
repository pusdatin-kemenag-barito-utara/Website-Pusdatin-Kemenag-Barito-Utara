package services

import (
	"context"
	"strings"

	"pusdatin/backend/internal/domain"
)

type AnnouncementService struct {
	repo      domain.AnnouncementRepository
	auditRepo domain.AuditRepository
}

func NewAnnouncementService(repo domain.AnnouncementRepository, auditRepo domain.AuditRepository) *AnnouncementService {
	return &AnnouncementService{
		repo:      repo,
		auditRepo: auditRepo,
	}
}

type CreateAnnouncementInput struct {
	Title       string `json:"title"`
	Tag         string `json:"tag"`
	Description string `json:"description"`
	IsImportant bool   `json:"isImportant"`
	IsActive    bool   `json:"isActive"`
	OrderIndex  int    `json:"orderIndex"`
}

type UpdateAnnouncementInput struct {
	Title       *string `json:"title"`
	Tag         *string `json:"tag"`
	Description *string `json:"description"`
	IsImportant *bool   `json:"isImportant"`
	IsActive    *bool   `json:"isActive"`
	OrderIndex  *int    `json:"orderIndex"`
}

func (s *AnnouncementService) ListAnnouncements(ctx context.Context, search string) ([]*domain.Announcement, error) {
	return s.repo.ListAnnouncements(ctx, search)
}

func (s *AnnouncementService) ListPublicAnnouncements(ctx context.Context) ([]*domain.Announcement, error) {
	return s.repo.ListPublicAnnouncements(ctx)
}

func (s *AnnouncementService) GetAnnouncement(ctx context.Context, id string) (*domain.Announcement, error) {
	return s.repo.GetAnnouncement(ctx, id)
}

func (s *AnnouncementService) CreateAnnouncement(ctx context.Context, actorEmail, clientIP string, req CreateAnnouncementInput) (*domain.Announcement, error) {
	if strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.Description) == "" {
		return nil, domain.ErrInvalidInput
	}

	tag := strings.TrimSpace(req.Tag)
	if tag == "" {
		tag = "Informasi"
	}

	a := &domain.Announcement{
		Title:       strings.TrimSpace(req.Title),
		Tag:         tag,
		Description: strings.TrimSpace(req.Description),
		IsImportant: req.IsImportant,
		IsActive:    req.IsActive,
		OrderIndex:  req.OrderIndex,
		CreatedBy:   &actorEmail,
	}

	if err := s.repo.CreateAnnouncement(ctx, a); err != nil {
		return nil, err
	}

	_ = s.auditRepo.InsertAuditLog(ctx, "CREATE", "announcement:"+a.ID, "kemenag_pusdatin",
		actorEmail, nil, a, clientIP)

	return a, nil
}

func (s *AnnouncementService) UpdateAnnouncement(ctx context.Context, actorEmail, clientIP, id string, req UpdateAnnouncementInput) (*domain.Announcement, error) {
	existing, err := s.repo.GetAnnouncement(ctx, id)
	if err != nil {
		return nil, domain.ErrNotFound
	}

	fields := map[string]any{}
	if req.Title != nil {
		fields["title"] = strings.TrimSpace(*req.Title)
	}
	if req.Tag != nil {
		fields["tag"] = strings.TrimSpace(*req.Tag)
	}
	if req.Description != nil {
		fields["description"] = strings.TrimSpace(*req.Description)
	}
	if req.IsImportant != nil {
		fields["is_important"] = *req.IsImportant
	}
	if req.IsActive != nil {
		fields["is_active"] = *req.IsActive
	}
	if req.OrderIndex != nil {
		fields["order_index"] = *req.OrderIndex
	}

	if len(fields) == 0 {
		return existing, nil
	}

	if err := s.repo.UpdateAnnouncement(ctx, id, fields); err != nil {
		return nil, err
	}

	updated, err := s.repo.GetAnnouncement(ctx, id)
	if err != nil {
		return nil, err
	}

	_ = s.auditRepo.InsertAuditLog(ctx, "UPDATE", "announcement:"+id, "kemenag_pusdatin",
		actorEmail, existing, updated, clientIP)

	return updated, nil
}

func (s *AnnouncementService) DeleteAnnouncement(ctx context.Context, actorEmail, clientIP, id string) error {
	existing, err := s.repo.GetAnnouncement(ctx, id)
	if err != nil {
		return domain.ErrNotFound
	}

	if err := s.repo.DeleteAnnouncement(ctx, id); err != nil {
		return err
	}

	_ = s.auditRepo.InsertAuditLog(ctx, "DELETE", "announcement:"+id, "kemenag_pusdatin",
		actorEmail, existing, nil, clientIP)

	return nil
}
