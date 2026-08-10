import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-helpers";
import { getCurrentSessionContext } from "@/lib/auth";
import { db } from "@/lib/drizzle";
import { users as usersTable, profilesPegawai } from "@/db/schema";
import { desc, isNotNull, eq } from "drizzle-orm";

export async function GET(_request: NextRequest) {
  try {
    const session = await getCurrentSessionContext();
    if (!session.isAdmin) {
      return apiResponse({ message: "Unauthorized" }, 401);
    }

    const records = await db
      .select({
        id: usersTable.id, // Using profileId as ID to keep it consistent
        nama: usersTable.name,
        email: usersTable.email,
        nip: profilesPegawai.nip,
        jabatan: profilesPegawai.jabatan,
        unitKerja: profilesPegawai.unitKerja,
        tipePejabat: profilesPegawai.tipePejabat,
        orderIndex: profilesPegawai.orderIndex,
      })
      .from(profilesPegawai)
      .innerJoin(usersTable, eq(profilesPegawai.profileId, usersTable.id))
      .where(isNotNull(profilesPegawai.tipePejabat))
      .orderBy(profilesPegawai.orderIndex, desc(profilesPegawai.createdAt));

    return apiResponse(records);
  } catch (err) {
    console.error("[PEJABAT] GET error:", err);
    return apiResponse({ message: "Internal server error" }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSessionContext();
    if (!session.isAdmin) {
      return apiResponse({ message: "Unauthorized" }, 401);
    }

    const body = await request.json();
    const { id, tipePejabat, orderIndex, unitKerja } = body;

    if (!id || !tipePejabat) {
      return apiResponse({ message: "Pegawai ID dan Tipe Pejabat wajib diisi" }, 400);
    }

    const [updatedRecord] = await db
      .update(profilesPegawai)
      .set({
        tipePejabat,
        orderIndex: orderIndex || 0,
        ...(unitKerja !== undefined ? { unitKerja } : {})
      })
      .where(eq(profilesPegawai.profileId, id))
      .returning();

    return apiResponse(updatedRecord, 201);
  } catch (err) {
    console.error("[PEJABAT] POST error:", err);
    return apiResponse({ message: "Internal server error" }, 500);
  }
}
