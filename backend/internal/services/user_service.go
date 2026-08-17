package services

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5/pgconn"

	"pusdatin/backend/internal/domain"
)

type UserService struct {
	userRepo  domain.UserRepository
	auditRepo domain.AuditRepository
	idp       domain.IdentityProvider
}

func NewUserService(userRepo domain.UserRepository, auditRepo domain.AuditRepository, idp domain.IdentityProvider) *UserService {
	return &UserService{
		userRepo:  userRepo,
		auditRepo: auditRepo,
		idp:       idp,
	}
}

type PermInput struct {
	AppID    string `json:"appId"`
	Role     string `json:"role"`
	AppName  string `json:"appName"`
	Features []any  `json:"features"`
}

type CreateUserInput struct {
	Name           string      `json:"name"`
	Email          string      `json:"email"`
	Password       string      `json:"password"`
	Role           string      `json:"role"`
	Status         string      `json:"status"`
	UserType       string      `json:"userType"`
	NIP            *string     `json:"nip"`
	Jabatan        *string     `json:"jabatan"`
	UnitKerja      *string     `json:"unitKerja"`
	AppPermissions []PermInput `json:"appPermissions"`
}

type UpdateUserInput struct {
	Name           *string     `json:"name"`
	Email          *string     `json:"email"`
	Password       string      `json:"password"`
	Role           *string     `json:"role"`
	Status         *string     `json:"status"`
	UserType       *string     `json:"userType"`
	NIP            *string     `json:"nip"`
	Jabatan        *string     `json:"jabatan"`
	UnitKerja      *string     `json:"unitKerja"`
	NoHP           *string     `json:"noHp"`
	Alamat         *string     `json:"alamat"`
	NIK            *string     `json:"nik"`
	Pekerjaan      *string     `json:"pekerjaan"`
	AppPermissions []PermInput `json:"appPermissions"`
}

func (s *UserService) ListUsers(ctx context.Context, userType, appID, search string) ([]*domain.User, error) {
	if userType == "" {
		userType = "internal_admin"
	}
	users, err := s.userRepo.ListUsers(ctx, userType, appID, search)
	if err != nil {
		return nil, err
	}

	ids := make([]string, 0, len(users))
	for _, u := range users {
		ids = append(ids, u.ID)
	}

	permMap, err := s.userRepo.ListPermissionsForUsers(ctx, ids)
	if err != nil {
		permMap = map[string][]domain.AppPermission{}
	}

	for _, u := range users {
		u.AppPermissions = permMap[u.ID]
		if u.AppPermissions == nil {
			u.AppPermissions = []domain.AppPermission{}
		}
	}

	return users, nil
}

func (s *UserService) GetUser(ctx context.Context, id string) (*domain.User, error) {
	user, err := s.userRepo.GetUser(ctx, id)
	if err != nil {
		return nil, domain.ErrNotFound
	}

	perms, err := s.userRepo.GetUserPermissions(ctx, id)
	if err != nil {
		perms = []domain.AppPermission{}
	}
	user.AppPermissions = perms
	return user, nil
}

func (s *UserService) CreateUser(ctx context.Context, actorEmail, clientIP string, req CreateUserInput) (*domain.User, error) {
	if req.Name == "" || req.Email == "" {
		return nil, domain.ErrInvalidInput
	}

	password := req.Password
	if password == "" {
		password = "@Kemenag126"
	}

	// 1. Create the user in Supabase Auth first
	authID, err := s.idp.AdminCreateUser(ctx, req.Email, password, req.Name)
	if err != nil {
		return nil, errors.New("gagal mendaftarkan akun di sistem autentikasi")
	}

	role := req.Role
	if role == "" {
		role = "admin"
	}
	userType := req.UserType
	if userType == "" {
		userType = "internal_admin"
	}
	status := req.Status
	if status == "" {
		status = "active"
	}

	// 2. Insert profile
	if err := s.userRepo.CreateUser(ctx, authID, req.Name, req.Email, role, userType, status); err != nil {
		return nil, err
	}

	// 3. Pegawai details
	if userType == "internal_pegawai" {
		nip := ""
		jabatan := ""
		unitKerja := ""
		if req.NIP != nil {
			nip = *req.NIP
		}
		if req.Jabatan != nil {
			jabatan = *req.Jabatan
		}
		if req.UnitKerja != nil {
			unitKerja = *req.UnitKerja
		}
		if err := s.userRepo.UpsertPegawai(ctx, authID, nip, jabatan, unitKerja); err != nil {
			return nil, err
		}
	}

	// 4. Permissions
	if len(req.AppPermissions) > 0 {
		perms := make([]domain.AppPermission, 0, len(req.AppPermissions))
		for _, p := range req.AppPermissions {
			perms = append(perms, domain.AppPermission{AppID: p.AppID, Role: p.Role, Features: p.Features})
		}
		if err := s.userRepo.ReplacePermissions(ctx, authID, perms); err != nil {
			return nil, err
		}
	}

	// 5. Audit + E-Surat sync
	_ = s.auditRepo.InsertAuditLog(ctx, "INSERT", "user:"+req.Email, "kemenag_pusdatin", actorEmail, nil, map[string]any{
		"id": authID, "name": req.Name, "email": req.Email, "role": role,
	}, clientIP)

	s.syncSurat(ctx, req.AppPermissions, authID, req.Name)

	newUser, err := s.userRepo.GetUser(ctx, authID)
	if err != nil {
		newUser = &domain.User{ID: authID, Name: req.Name, Email: req.Email, Role: role, UserType: userType, Status: status}
	}
	return newUser, nil
}

func (s *UserService) UpdateUser(ctx context.Context, actorEmail, clientIP, id string, req UpdateUserInput) (*domain.User, error) {
	oldUser, err := s.userRepo.GetUser(ctx, id)
	if err != nil {
		return nil, domain.ErrNotFound
	}

	profileFields := map[string]any{}
	if req.Name != nil {
		profileFields["name"] = *req.Name
	}
	if req.Email != nil {
		profileFields["email"] = *req.Email
	}
	if req.Role != nil {
		profileFields["role"] = *req.Role
	}
	if req.Status != nil {
		profileFields["status"] = *req.Status
	}
	if req.UserType != nil {
		profileFields["user_type"] = *req.UserType
	}
	if req.NoHP != nil {
		profileFields["phone"] = *req.NoHP
	}
	if req.Alamat != nil {
		profileFields["address"] = *req.Alamat
	}
	if len(profileFields) > 0 {
		if err := s.userRepo.UpdateUser(ctx, id, profileFields); err != nil {
			return nil, err
		}
	}

	if req.NIP != nil || req.Jabatan != nil || req.UnitKerja != nil {
		nip, jabatan, unitKerja := "", "", ""
		if req.NIP != nil {
			nip = *req.NIP
		}
		if req.Jabatan != nil {
			jabatan = *req.Jabatan
		}
		if req.UnitKerja != nil {
			unitKerja = *req.UnitKerja
		}
		if err := s.userRepo.UpsertPegawai(ctx, id, nip, jabatan, unitKerja); err != nil {
			return nil, err
		}
	}
	if req.NoHP != nil || req.Alamat != nil || req.NIK != nil || req.Pekerjaan != nil {
		noHp, alamat, nik, pekerjaan := "", "", "", ""
		if req.NoHP != nil {
			noHp = *req.NoHP
		}
		if req.Alamat != nil {
			alamat = *req.Alamat
		}
		if req.NIK != nil {
			nik = *req.NIK
		}
		if req.Pekerjaan != nil {
			pekerjaan = *req.Pekerjaan
		}
		if err := s.userRepo.UpsertPemohon(ctx, id, noHp, alamat, nik, pekerjaan); err != nil {
			return nil, err
		}
	}

	if req.AppPermissions != nil {
		perms := make([]domain.AppPermission, 0, len(req.AppPermissions))
		for _, p := range req.AppPermissions {
			perms = append(perms, domain.AppPermission{AppID: p.AppID, Role: p.Role, Features: p.Features})
		}
		if err := s.userRepo.ReplacePermissions(ctx, id, perms); err != nil {
			return nil, err
		}
	}

	newName := oldUser.Name
	if req.Name != nil {
		newName = *req.Name
	}
	newEmail := oldUser.Email
	if req.Email != nil {
		newEmail = *req.Email
	}
	newRole := oldUser.Role
	if req.Role != nil {
		newRole = *req.Role
	}

	_ = s.auditRepo.InsertAuditLog(ctx, "UPDATE", "user:"+oldUser.Email, "kemenag_pusdatin", actorEmail, map[string]any{
		"name": oldUser.Name, "email": oldUser.Email, "role": oldUser.Role,
	}, map[string]any{
		"name": newName, "email": newEmail, "role": newRole,
	}, clientIP)

	// Sync to Supabase Auth
	authID, _ := s.idp.AdminFindUserByEmail(ctx, oldUser.Email)
	if authID != "" {
		updatePayload := map[string]any{}
		if req.Name != nil {
			updatePayload["user_metadata"] = map[string]string{"full_name": newName}
		}
		if req.Email != nil {
			updatePayload["email"] = *req.Email
		}
		if req.Password != "" {
			updatePayload["password"] = req.Password
		}
		if len(updatePayload) > 0 {
			_ = s.idp.AdminUpdateUser(ctx, authID, updatePayload)
		}
		s.syncSurat(ctx, req.AppPermissions, authID, newName)
	}

	updatedUser, err := s.userRepo.GetUser(ctx, id)
	if err != nil {
		return &domain.User{ID: id, Name: newName, Email: newEmail, Role: newRole}, nil
	}
	perms, err := s.userRepo.GetUserPermissions(ctx, id)
	if err != nil {
		perms = []domain.AppPermission{}
	}
	updatedUser.AppPermissions = perms
	return updatedUser, nil
}

func (s *UserService) DeleteUser(ctx context.Context, actorEmail, clientIP, id string) error {
	user, err := s.userRepo.GetUser(ctx, id)
	if err != nil {
		return nil
	}

	s.userRepo.NullifyPTSPReferences(ctx, id)
	_ = s.userRepo.DeleteSuratPengguna(ctx, id)

	if err := s.userRepo.DeleteUser(ctx, id); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			return domain.ErrHasDependencies
		}
		return err
	}

	_ = s.auditRepo.InsertAuditLog(ctx, "DELETE", "user:"+user.Email, "kemenag_pusdatin", actorEmail, map[string]any{
		"name": user.Name, "email": user.Email, "role": user.Role,
	}, nil, clientIP)

	_ = s.idp.AdminDeleteUser(ctx, user.ID)
	return nil
}

func (s *UserService) syncSurat(ctx context.Context, perms []PermInput, userID, nama string) {
	for _, p := range perms {
		if p.AppID != "e-surat-kemenag" {
			continue
		}
		if p.Role != "none" {
			_ = s.userRepo.SyncSuratPengguna(ctx, userID, nama, true)
		} else {
			_ = s.userRepo.SyncSuratPengguna(ctx, userID, nama, false)
		}
	}
}
