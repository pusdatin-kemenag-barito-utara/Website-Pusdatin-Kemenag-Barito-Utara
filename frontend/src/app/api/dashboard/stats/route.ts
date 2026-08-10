import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-helpers";
import { getCurrentSessionContext } from "@/lib/auth";
import { db } from "@/lib/drizzle";
import { users as usersTable, satelliteApps, auditLogs } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";

export async function GET(_request: NextRequest) {
  try {
    const session = await getCurrentSessionContext();
    if (!session.isAdmin) {
      return apiResponse({ message: "Unauthorized" }, 401);
    }

    const [totalUsersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(usersTable);

    const activeUsers = await db
      .select({ count: sql<number>`count(*)` })
      .from(usersTable)
      .where(eq(usersTable.status, "active"));

    const totalApps = await db
      .select({ count: sql<number>`count(*)` })
      .from(satelliteApps);

    const onlineApps = await db
      .select({ count: sql<number>`count(*)` })
      .from(satelliteApps)
      .where(eq(satelliteApps.status, "online"));

    const totalLogsResult = await db.execute(sql`SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = 'audit_logs'`);
    const estimatedTotalLogs = totalLogsResult.rows[0]?.estimate || 0;

    const todayLogs = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .where(
        sql`${auditLogs.timestamp} >= CURRENT_DATE`,
      );

    return apiResponse({
      totalUsers: Number(totalUsersResult?.count || 0),
      activeUsers: Number(activeUsers[0]?.count || 0),
      totalApps: Number(totalApps[0]?.count || 0),
      onlineApps: Number(onlineApps[0]?.count || 0),
      totalLogs: Number(estimatedTotalLogs),
      todayLogs: Number(todayLogs[0]?.count || 0),
    });
  } catch (err) {
    console.error("[DASHBOARD STATS] error:", err);
    return apiResponse({ message: "Internal server error" }, 500);
  }
}
