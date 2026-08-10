import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-helpers";
import { getCurrentSessionContext } from "@/lib/auth";
import { db } from "@/lib/drizzle";
import { auditLogs } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSessionContext();
    if (!session.isAdmin) {
      return apiResponse({ message: "Unauthorized" }, 401);
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "7");

    const result = await db.execute(
      sql`
        SELECT 
          DATE(timestamp) as date,
          COUNT(*)::int as count
        FROM ${auditLogs}
        WHERE timestamp >= CURRENT_DATE - (${days} || ' days')::interval
        GROUP BY DATE(timestamp)
        ORDER BY date ASC
      `,
    );

    return apiResponse(result.rows);
  } catch (err) {
    console.error("[REPORTS ACTIVITY] error:", err);
    return apiResponse({ message: "Internal server error" }, 500);
  }
}
