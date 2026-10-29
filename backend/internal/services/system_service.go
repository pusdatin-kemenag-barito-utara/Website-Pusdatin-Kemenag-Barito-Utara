package services

import (
	"context"

	"pusdatin/backend/internal/domain"
)

type SystemService struct {
	systemRepo domain.SystemRepository
}

func NewSystemService(systemRepo domain.SystemRepository) *SystemService {
	return &SystemService{
		systemRepo: systemRepo,
	}
}

func (s *SystemService) PingDatabase(ctx context.Context) error {
	return s.systemRepo.Ping(ctx)
}
