import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-helpers";
import { getCurrentSessionContext } from "@/lib/auth";
import { db } from "@/lib/drizzle";
import { systemMetrics, auditLogs } from "@/db/schema";
import { desc, lt } from "drizzle-orm";
import { withRetry } from "@/lib/db-retry";

export async function GET(_request: NextRequest) {
  try {
    const session = await getCurrentSessionContext();
    if (!session.isAdmin) {
      return apiResponse({ message: "Unauthorized" }, 401);
    }

    const [latest] = await withRetry(
      () => db.select().from(systemMetrics).orderBy(desc(systemMetrics.recordedAt)).limit(1),
      2, "HEALTH"
    );

    // Probabilistic background data pruning (1% chance to run on health check)
    // Deletes metrics and logs older than 30 days to prevent database bloat
    if (Math.random() < 0.01) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      db.delete(systemMetrics).where(lt(systemMetrics.recordedAt, thirtyDaysAgo)).execute().catch(() => {});
      db.delete(auditLogs).where(lt(auditLogs.timestamp, thirtyDaysAgo)).execute().catch(() => {});
    }

    return apiResponse(
      latest || { cpu: 0, ram: 0, storage: 0, uptime: "N/A" },
    );
  } catch (err) {
    console.error("[SYSTEM HEALTH] error:", err);
    return apiResponse({ message: "Internal server error" }, 500);
  }
}
