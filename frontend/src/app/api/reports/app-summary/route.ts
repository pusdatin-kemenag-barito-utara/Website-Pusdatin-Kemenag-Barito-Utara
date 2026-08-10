import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-helpers";
import { getCurrentSessionContext } from "@/lib/auth";
import { db } from "@/lib/drizzle";
import { satelliteApps, auditLogs } from "@/db/schema";
import { sql, eq } from "drizzle-orm";

export async function GET(_request: NextRequest) {
  try {
    const session = await getCurrentSessionContext();
    if (!session.isAdmin) {
      return apiResponse({ message: "Unauthorized" }, 401);
    }

    const apps = await db.select().from(satelliteApps);
    const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logCounts = await db
      .select({
        schema: auditLogs.targetSchema,
        count: sql<number>`count(*)`,
      })
      .from(auditLogs)
      .where(sql`${auditLogs.timestamp} >= ${thirtyDaysAgo}`)
      .groupBy(auditLogs.targetSchema);

    const result = apps.map((app, i) => {
      const match = logCounts.find((lc) => lc.schema === app.schemaName);
      return {
        appName: app.name,
        count: Number(match?.count || 0),
        color: colors[i % colors.length],
      };
    });

    return apiResponse(result);
  } catch (err) {
    console.error("[REPORTS APP-SUMMARY] error:", err);
    return apiResponse({ message: "Internal server error" }, 500);
  }
}
