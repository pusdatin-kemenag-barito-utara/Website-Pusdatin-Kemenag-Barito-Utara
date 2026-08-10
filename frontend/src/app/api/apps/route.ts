import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-helpers";
import { getCurrentSessionContext } from "@/lib/auth";
import { db } from "@/lib/drizzle";
import { satelliteApps } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { withRetry } from "@/lib/db-retry";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getCurrentSessionContext();
    if (!session.isAdmin) {
      return apiResponse({ message: "Unauthorized" }, 401);
    }

    const apps = await withRetry(
      () => db.select().from(satelliteApps).orderBy(asc(satelliteApps.sortOrder)),
      2, "APPS"
    );
    return apiResponse(apps);
  } catch (err) {
    console.error("[APPS] GET error:", err);
    return apiResponse({ message: "Internal server error" }, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSessionContext();
    if (!session.isAdmin) {
      return apiResponse({ message: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const { id, name, description, icon, url, schemaName, schemaUrl, status, sortOrder } = body;

    if (!id || !name || !schemaName) {
      return apiResponse({ message: "ID, Nama, dan Schema Name wajib diisi" }, 400);
    }

    // Check if ID already exists
    const [existing] = await db
      .select({ id: satelliteApps.id })
      .from(satelliteApps)
      .where(eq(satelliteApps.id, id))
      .limit(1);

    if (existing) {
      return apiResponse({ message: "ID Aplikasi sudah digunakan" }, 400);
    }

    const newApp = await db.insert(satelliteApps).values({
      id,
      name,
      description,
      icon,
      url,
      schemaName,
      schemaUrl,
      status: status || "online",
      sortOrder: sortOrder || 0,
      availableFeatures: [],
    }).returning();

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/");
    revalidatePath("/dashboard/apps");

    return apiResponse(newApp[0], 201);
  } catch (err) {
    console.error("[APPS] POST error:", err);
    return apiResponse({ message: "Internal server error" }, 500);
  }
}
