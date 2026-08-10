import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-helpers";
import { getCurrentSessionContext } from "@/lib/auth";
import { db } from "@/lib/drizzle";
import { profilesPegawai } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentSessionContext();
    if (!session.isAdmin) {
      return apiResponse({ message: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const body = await request.json();
    const { tipePejabat, unitKerja, nama, nip, jabatan, orderIndex } = body;

    const updateData: Record<string, unknown> = {};
    if (tipePejabat !== undefined) updateData.tipePejabat = tipePejabat;
    if (orderIndex !== undefined) updateData.orderIndex = orderIndex;
    if (unitKerja !== undefined) updateData.unitKerja = unitKerja;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(profilesPegawai)
      .set(updateData)
      .where(eq(profilesPegawai.profileId, id))
      .returning();

    if (!updated) {
      return apiResponse({ message: "Pejabat tidak ditemukan" }, 404);
    }

    return apiResponse(updated);
  } catch (err) {
    console.error("[PEJABAT] PUT error:", err);
    return apiResponse({ message: "Internal server error" }, 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentSessionContext();
    if (!session.isAdmin) {
      return apiResponse({ message: "Unauthorized" }, 401);
    }

    const { id } = await params;

    const [deleted] = await db
      .update(profilesPegawai)
      .set({ tipePejabat: null, orderIndex: 0, updatedAt: new Date() })
      .where(eq(profilesPegawai.profileId, id))
      .returning();

    if (!deleted) {
      return apiResponse({ message: "Pejabat tidak ditemukan" }, 404);
    }

    return apiResponse({ ok: true });
  } catch (err) {
    console.error("[PEJABAT] DELETE error:", err);
    return apiResponse({ message: "Internal server error" }, 500);
  }
}
