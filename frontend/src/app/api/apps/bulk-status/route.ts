import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-helpers";
import { getCurrentSessionContext } from "@/lib/auth";
import { db } from "@/lib/drizzle";
import { satelliteApps } from "@/db/schema";
import { recordAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSessionContext();
    if (!session.isAdmin) {
      return apiResponse({ message: "Unauthorized" }, 401);
    }

    const { status } = await request.json();

    if (!status || !["online", "maintenance", "degraded"].includes(status)) {
      return apiResponse({ message: "Status tidak valid" }, 400);
    }

    await db.update(satelliteApps).set({ status, lastHealthCheck: new Date() });

    await recordAudit({
      action: "UPDATE",
      target: "app:all",
      targetSchema: "kemenag_pusdatin",
      performedBy: session.user?.email ?? "unknown",
      ip: getClientIp(request),
      beforeState: { status: "mixed" },
      afterState: { status },
    });

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/");
    revalidatePath("/dashboard/apps");

    return apiResponse({ ok: true, message: `Semua aplikasi berhasil diubah ke mode ${status}` });
  } catch (error) {
    console.error("Bulk Status Error:", error);
    return apiResponse({ message: "Gagal mengubah status semua aplikasi" }, 500);
  }
}
