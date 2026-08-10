import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-helpers";
import { getCurrentSessionContext } from "@/lib/auth";
import { db } from "@/lib/drizzle";
import {
  users as usersTable,
  appPermissions,
  profilesPegawai,
  profilesPemohon,
} from "@/db/schema";
import { recordAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { eq, and, ne, sql } from "drizzle-orm";
import { withRetry } from "@/lib/db-retry";
import bcrypt from "bcryptjs";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSessionContext();
    if (!session.isAdmin) {
      return apiResponse({ message: "Unauthorized" }, 401);
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase();
    const appId = searchParams.get("appId");
    const userType = searchParams.get("type") || "internal_admin";

    let query = db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        role: usersTable.role,
        userType: usersTable.userType,
        status: usersTable.status,
        avatar: usersTable.avatar,
        nip: profilesPegawai.nip,
        jabatan: profilesPegawai.jabatan,
        pangkatGolongan: profilesPegawai.pangkatGolongan,
        unitKerja: profilesPegawai.unitKerja,
        noHp: sql<string>`COALESCE(${profilesPemohon.noHp}, ${usersTable.phone})`,
        alamat: sql<string>`COALESCE(${profilesPemohon.alamat}, ${usersTable.address})`,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
      })
      .from(usersTable)
      .leftJoin(profilesPegawai, eq(usersTable.id, profilesPegawai.profileId))
      .leftJoin(profilesPemohon, eq(usersTable.id, profilesPemohon.profileId));

    if (userType) {
      query = query.where(eq(usersTable.userType, userType)) as any;
    }

    if (appId) {
      query = query
        .innerJoin(appPermissions, eq(usersTable.id, appPermissions.userId))
        .where(
          and(eq(appPermissions.appId, appId), ne(appPermissions.role, "none")),
        ) as any;
    }

    const allUsers = await withRetry(() => query, 2, "USERS");

    const filtered = search
      ? allUsers.filter(
          (u) =>
            u.name.toLowerCase().includes(search) ||
            u.email.toLowerCase().includes(search),
        )
      : allUsers;

    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const serialized = filtered.map((u) => ({
      ...u,
      createdAt:
        u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
      updatedAt:
        u.updatedAt instanceof Date ? u.updatedAt.toISOString() : u.updatedAt,
    }));

    return apiResponse(serialized);
  } catch (err: any) {
    console.error("[USERS] GET error:", err);
    return apiResponse({ message: err.message, stack: err.stack }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSessionContext();
    if (!session.isAdmin) {
      return apiResponse({ message: "Unauthorized" }, 401);
    }

    const body = await request.json();
    const {
      name,
      email,
      password,
      role,
      status,
      userType,
      nip,
      jabatan,
      unitKerja,
      appPermissions: newPerms,
    } = body;

    if (!name || !email) {
      return apiResponse({ message: "Nama dan email wajib diisi" }, 400);
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    // Create user in Supabase Auth first
    const adminClient = createAdminSupabaseClient();
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email,
        password: password || "@Kemenag126",
        email_confirm: true,
        user_metadata: { full_name: name },
      });

    if (authError || !authData.user) {
      console.error("[USERS] Supabase Auth error:", authError);
      return apiResponse(
        { message: "Gagal mendaftarkan akun di sistem autentikasi." },
        500,
      );
    }

    const [newUser] = await db
      .insert(usersTable)
      .values({
        id: authData.user.id,
        name,
        email,
        passwordHash,
        role: role || "admin",
        userType: userType || "internal_admin",
        status: status || "active",
      })
      .returning();

    if (userType === "internal_pegawai") {
      await db.insert(profilesPegawai).values({
        profileId: newUser.id,
        nip: nip || null,
        jabatan: jabatan || null,
        unitKerja: unitKerja || null,
      });
    }

    if (newPerms && newPerms.length > 0) {
      await db.insert(appPermissions).values(
        newPerms.map(
          (p: {
            appId: string;
            role: string;
            appName: string;
            features?: string[];
          }) => ({
            userId: newUser.id,
            appId: p.appId,
            role: p.role,
            features: p.features || [],
          }),
        ),
      );
    }

    await recordAudit({
      action: "INSERT",
      target: `user:${newUser.email}`,
      targetSchema: "kemenag_pusdatin",
      performedBy: session.user?.email ?? "unknown",
      ip: getClientIp(request),
      afterState: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });

    // Sync ke kemenag_surat.pengguna jika diberi akses E-Surat
    if (newPerms && newPerms.length > 0) {
      const suratPerm = newPerms.find(
        (p: any) => p.appId === "e-surat-kemenag" && p.role !== "none",
      );
      if (suratPerm) {
        try {
          await db.execute(sql`
            INSERT INTO "kemenag_surat"."pengguna" (id, nama, is_active, created_at, updated_at)
            VALUES (${newUser.id}, ${newUser.name}, true, now(), now())
            ON CONFLICT (id) DO UPDATE
            SET nama = EXCLUDED.nama,
                is_active = true,
                updated_at = now()
          `);
        } catch (suratSyncErr) {
          console.error(
            "[SYNC ERROR] Failed to sync new user to kemenag_surat:",
            suratSyncErr,
          );
        }
      }
    }

    return apiResponse(newUser, 201);
  } catch (err) {
    console.error("[USERS] POST error:", err);
    return apiResponse({ message: "Internal server error" }, 500);
  }
}
