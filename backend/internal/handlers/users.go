package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgconn"

	"pusdatin/backend/internal/auth"
	"pusdatin/backend/internal/database"
	"pusdatin/backend/internal/utils"
)

type permInput struct {
	AppID    string `json:"appId"`
	Role     string `json:"role"`
	AppName  string `json:"appName"`
	Features []any  `json:"features"`
}

func (h *Handler) ListUsers(c *fiber.Ctx) error {
	userType := c.Query("type", "internal_admin")
	appID := c.Query("appId")
	search := c.Query("search")

	users, err := h.Store.ListUsers(c.Context(), userType, appID, search)
	if err != nil {
		return utils.Internal(c, "Internal server error")
	}

	ids := make([]string, 0, len(users))
	for _, u := range users {
		ids = append(ids, u.ID)
	}
	permMap, err := h.Store.ListPermissionsForUsers(c.Context(), ids)
	if err != nil {
		permMap = map[string][]database.AppPermission{}
	}
	for _, u := range users {
		u.AppPermissions = permMap[u.ID]
		if u.AppPermissions == nil {
			u.AppPermissions = []database.AppPermission{}
		}
	}

	return utils.OK(c, users)
}

func (h *Handler) CreateUser(c *fiber.Ctx) error {
	var req struct {
		Name          string      `json:"name"`
		Email         string      `json:"email"`
		Password      string      `json:"password"`
		Role          string      `json:"role"`
		Status        string      `json:"status"`
		UserType      string      `json:"userType"`
		NIP           *string     `json:"nip"`
		Jabatan       *string     `json:"jabatan"`
		UnitKerja     *string     `json:"unitKerja"`
		AppPermissions []permInput `json:"appPermissions"`
	}
	if err := body(c, &req); err != nil {
		return err
	}
	if req.Name == "" || req.Email == "" {
		return utils.Bad(c, "Nama dan email wajib diisi")
	}

	password := req.Password
	if password == "" {
		password = "@Kemenag126"
	}

	session := auth.GetSession(c)

	// 1. Create the user in Supabase Auth first (id becomes the profile id).
	authID, err := h.Auth.AdminCreateUser(c.Context(), req.Email, password, req.Name)
	if err != nil {
		return utils.Internal(c, "Gagal mendaftarkan akun di sistem autentikasi.")
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

	// 2. Insert the profile row.
	if err := h.Store.CreateUser(c.Context(), authID, req.Name, req.Email, role, userType, status); err != nil {
		return utils.Internal(c, "Internal server error")
	}

	// 3. Pegawai details.
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
		if err := h.Store.UpsertPegawai(c.Context(), authID, nip, jabatan, unitKerja); err != nil {
			return utils.Internal(c, "Internal server error")
		}
	}

	// 4. Permissions.
	if len(req.AppPermissions) > 0 {
		perms := make([]database.AppPermission, 0, len(req.AppPermissions))
		for _, p := range req.AppPermissions {
			perms = append(perms, database.AppPermission{AppID: p.AppID, Role: p.Role, Features: p.Features})
		}
		if err := h.Store.ReplacePermissions(c.Context(), authID, perms); err != nil {
			return utils.Internal(c, "Internal server error")
		}
	}

	// 5. Audit + E-Surat sync.
	h.recordAudit(c, "INSERT", "user:"+req.Email, sessionEmail(session), nil, map[string]any{
		"id": authID, "name": req.Name, "email": req.Email, "role": role,
	})

	syncSuratForPerms(c, h, req.AppPermissions, authID, req.Name)

	newUser, err := h.Store.GetUser(c.Context(), authID)
	if err != nil {
		newUser = &database.User{ID: authID, Name: req.Name, Email: req.Email, Role: role, UserType: userType, Status: status}
	}
	return utils.Created(c, newUser)
}

func (h *Handler) GetUser(c *fiber.Ctx) error {
	id := c.Params("id")
	user, err := h.Store.GetUser(c.Context(), id)
	if err != nil {
		return utils.NotFound(c, "User not found")
	}
	perms, err := h.Store.GetUserPermissions(c.Context(), id)
	if err != nil {
		perms = []database.AppPermission{}
	}
	user.AppPermissions = perms
	return utils.OK(c, user)
}

func (h *Handler) UpdateUser(c *fiber.Ctx) error {
	id := c.Params("id")
	session := auth.GetSession(c)

	oldUser, err := h.Store.GetUser(c.Context(), id)
	if err != nil {
		return utils.NotFound(c, "User not found")
	}

	var req struct {
		Name          *string     `json:"name"`
		Email         *string     `json:"email"`
		Password      string      `json:"password"`
		Role          *string     `json:"role"`
		Status        *string     `json:"status"`
		UserType      *string     `json:"userType"`
		NIP           *string     `json:"nip"`
		Jabatan       *string     `json:"jabatan"`
		UnitKerja     *string     `json:"unitKerja"`
		NoHP          *string     `json:"noHp"`
		Alamat        *string     `json:"alamat"`
		NIK           *string     `json:"nik"`
		Pekerjaan     *string     `json:"pekerjaan"`
		AppPermissions []permInput `json:"appPermissions"`
	}
	if err := body(c, &req); err != nil {
		return err
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
		if err := h.Store.UpdateUser(c.Context(), id, profileFields); err != nil {
			return utils.Internal(c, "Internal server error")
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
		if err := h.Store.UpsertPegawai(c.Context(), id, nip, jabatan, unitKerja); err != nil {
			return utils.Internal(c, "Internal server error")
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
		if err := h.Store.UpsertPemohon(c.Context(), id, noHp, alamat, nik, pekerjaan); err != nil {
			return utils.Internal(c, "Internal server error")
		}
	}

	if req.AppPermissions != nil {
		perms := make([]database.AppPermission, 0, len(req.AppPermissions))
		for _, p := range req.AppPermissions {
			perms = append(perms, database.AppPermission{AppID: p.AppID, Role: p.Role, Features: p.Features})
		}
		if err := h.Store.ReplacePermissions(c.Context(), id, perms); err != nil {
			return utils.Internal(c, "Internal server error")
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

	h.recordAudit(c, "UPDATE", "user:"+oldUser.Email, sessionEmail(session), map[string]any{
		"name": oldUser.Name, "email": oldUser.Email, "role": oldUser.Role,
	}, map[string]any{
		"name": newName, "email": newEmail, "role": newRole,
	})

	// Sync to Supabase Auth (find by old email first).
	authID, _ := h.Auth.AdminFindUserByEmail(c.Context(), oldUser.Email)
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
			_ = h.Auth.AdminUpdateUser(c.Context(), authID, updatePayload)
		}
		syncSuratForPerms(c, h, req.AppPermissions, authID, newName)
	}

	updatedUser, err := h.Store.GetUser(c.Context(), id)
	if err != nil {
		return utils.OK(c, map[string]any{"ok": true})
	}
	perms, err := h.Store.GetUserPermissions(c.Context(), id)
	if err != nil {
		perms = []database.AppPermission{}
	}
	updatedUser.AppPermissions = perms
	return utils.OK(c, updatedUser)
}

func (h *Handler) DeleteUser(c *fiber.Ctx) error {
	id := c.Params("id")
	session := auth.GetSession(c)

	user, err := h.Store.GetUser(c.Context(), id)
	if err != nil {
		return utils.OK(c, map[string]any{"ok": true})
	}

	h.Store.NullifyPTSPReferences(c.Context(), id)
	h.Store.DeleteSuratPengguna(c.Context(), id)

	if err := h.Store.DeleteUser(c.Context(), id); err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23503" {
			return utils.Bad(c, "Gagal menghapus pengguna karena akun ini sudah memiliki riwayat aktivitas/permohonan. Silakan ubah status pengguna menjadi Nonaktif.")
		}
		return utils.Internal(c, "Internal server error")
	}

	h.recordAudit(c, "DELETE", "user:"+user.Email, sessionEmail(session), map[string]any{
		"name": user.Name, "email": user.Email, "role": user.Role,
	}, nil)

	// Delete from Supabase Auth (profiles.id == auth.users.id in this codebase).
	_ = h.Auth.AdminDeleteUser(c.Context(), user.ID)

	return utils.OK(c, map[string]any{"ok": true})
}

func syncSuratForPerms(c *fiber.Ctx, h *Handler, perms []permInput, userID, nama string) {
	for _, p := range perms {
		if p.AppID != "e-surat-kemenag" {
			continue
		}
		if p.Role != "none" {
			_ = h.Store.SyncSuratPengguna(c.Context(), userID, nama, true)
		} else {
			_ = h.Store.SyncSuratPengguna(c.Context(), userID, nama, false)
		}
	}
}

func sessionEmail(s *auth.SessionContext) string {
	if s != nil && s.User != nil {
		return s.User.Email
	}
	return "unknown"
}
