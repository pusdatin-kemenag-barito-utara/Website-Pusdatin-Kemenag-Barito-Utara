import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-helpers";
import { getCurrentSessionContext } from "@/lib/auth";
import { db } from "@/lib/drizzle";
import { satelliteApps } from "@/db/schema";
import { recordAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

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
    const { status } = await request.json();

    if (!["online", "maintenance", "degraded"].includes(status)) {
      return apiResponse({ message: "Status tidak valid" }, 400);
    }

    const [app] = await db
      .select()
      .from(satelliteApps)
      .where(eq(satelliteApps.id, id))
      .limit(1);

    if (!app) {
      return apiResponse({ message: "Aplikasi tidak ditemukan" }, 404);
    }

    await db
      .update(satelliteApps)
      .set({ status, lastHealthCheck: new Date() })
      .where(eq(satelliteApps.id, id));

    await recordAudit({
      action: "UPDATE",
      target: `app:${app.name}`,
      targetSchema: "kemenag_pusdatin",
      performedBy: session.user?.email ?? "unknown",
      ip: getClientIp(request),
      beforeState: { status: app.status },
      afterState: { status },
    });

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/");
    revalidatePath("/dashboard/apps");

    return apiResponse({ ok: true });
  } catch (err) {
    console.error("[APP STATUS] PUT error:", err);
    return apiResponse({ message: "Internal server error" }, 500);
  }
}
