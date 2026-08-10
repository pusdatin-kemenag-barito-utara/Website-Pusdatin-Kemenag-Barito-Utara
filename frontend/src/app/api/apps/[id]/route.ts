import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-helpers";
import { getCurrentSessionContext } from "@/lib/auth";
import { db } from "@/lib/drizzle";
import { satelliteApps } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  context: { params: any }
) {
  try {
    const session = await getCurrentSessionContext();
    if (!session.isAdmin) {
      return apiResponse({ message: "Unauthorized" }, 401);
    }

    const resolvedParams = await context.params;
    const id = resolvedParams.id;
    const body = await request.json();

    const { name, url, schemaName, schemaUrl, sortOrder, description, icon } = body;

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (url !== undefined) updates.url = url;
    if (schemaName !== undefined) updates.schemaName = schemaName;
    if (schemaUrl !== undefined) updates.schemaUrl = schemaUrl;
    if (sortOrder !== undefined) updates.sortOrder = parseInt(sortOrder, 10);
    if (description !== undefined) updates.description = description;
    if (icon !== undefined) updates.icon = icon;

    if (Object.keys(updates).length === 0) {
      return apiResponse({ message: "No data to update" }, 400);
    }

    await db
      .update(satelliteApps)
      .set(updates)
      .where(eq(satelliteApps.id, id));

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/");
    revalidatePath("/dashboard/apps");

    return apiResponse({ message: "App updated successfully" });
  } catch (err) {
    console.error("[APPS] PATCH error:", err);
    return apiResponse({ message: "Internal server error" }, 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: any }
) {
  try {
    const session = await getCurrentSessionContext();
    if (!session.isAdmin) {
      return apiResponse({ message: "Unauthorized" }, 401);
    }

    const resolvedParams = await context.params;
    const id = resolvedParams.id;

    if (!id) {
      return apiResponse({ message: "ID aplikasi tidak valid" }, 400);
    }

    await db
      .delete(satelliteApps)
      .where(eq(satelliteApps.id, id));

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/");
    revalidatePath("/dashboard/apps");

    return apiResponse({ message: "Aplikasi berhasil dihapus" });
  } catch (err) {
    console.error("[APPS] DELETE error:", err);
    return apiResponse({ message: "Gagal menghapus aplikasi" }, 500);
  }
}

