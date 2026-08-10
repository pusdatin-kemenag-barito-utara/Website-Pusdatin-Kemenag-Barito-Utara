import { NextRequest } from "next/server";
import { apiResponse } from "@/lib/api-helpers";
import { getCurrentSessionContext } from "@/lib/auth";
import { db } from "@/lib/drizzle";
import { auditLogs } from "@/db/schema";
import { eq, desc, like, and, gte, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { withRetry } from "@/lib/db-retry";
import { profiles } from "@/db/schema";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSessionContext();
    if (!session.isAdmin) {
      return apiResponse({ message: "Unauthorized" }, 401);
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const actionFilter = searchParams.get("action");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");
    const targetSchema = searchParams.get("targetSchema");

    const conditions: ReturnType<typeof eq>[] = [];

    if (actionFilter) {
      conditions.push(eq(auditLogs.action, actionFilter));
    }
    if (targetSchema) {
      conditions.push(eq(auditLogs.targetSchema, targetSchema));
    }
    if (startDate) {
      conditions.push(gte(auditLogs.timestamp, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(auditLogs.timestamp, new Date(endDate)));
    }

    if (search) {
      conditions.push(like(auditLogs.target, `%${search}%`));
    }

    let query = db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        target: auditLogs.target,
        targetSchema: auditLogs.targetSchema,
        performedBy: sql<string>`COALESCE(${profiles.name}, ${auditLogs.performedBy})`,
        beforeState: auditLogs.beforeState,
        afterState: auditLogs.afterState,
        ip: auditLogs.ip,
        timestamp: auditLogs.timestamp,
      })
      .from(auditLogs)
      .leftJoin(profiles, eq(auditLogs.performedBy, sql`${profiles.id}::text`))
      .orderBy(desc(auditLogs.timestamp));
    let total = 0;

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
      const countQuery = db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(and(...conditions));
      const countResult = await countQuery;
      total = Number(countResult[0]?.count || 0);
    } else {
      const totalLogsResult = await db.execute(sql`SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = 'audit_logs'`);
      total = Number(totalLogsResult.rows[0]?.estimate || 0);
    }

    const offset = (page - 1) * limit;
    const rawData = await withRetry(
      () => query.limit(limit).offset(offset),
      2, "AUDIT"
    );

    const data = rawData.map(log => {
      let displayTarget = log.target;
      if (displayTarget.startsWith("auth ")) {
        displayTarget = "Sistem Autentikasi"; // Bersihkan id panjang
      }
      return { ...log, target: displayTarget };
    });

    return apiResponse({ data, total });
  } catch (err) {
    console.error("[AUDIT] GET error:", err);
    return apiResponse({ message: "Internal server error" }, 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getCurrentSessionContext();
    if (!session.isAdmin) {
      return apiResponse({ message: "Unauthorized" }, 401);
    }

    const { searchParams } = new URL(request.url);
    const targetSchema = searchParams.get("targetSchema");

    if (targetSchema) {
      await db.delete(auditLogs).where(eq(auditLogs.targetSchema, targetSchema));
    } else {
      await db.delete(auditLogs);
    }

    return apiResponse({ message: "Audit logs deleted successfully" });
  } catch (err) {
    console.error("[AUDIT] DELETE error:", err);
    return apiResponse({ message: "Internal server error" }, 500);
  }
}
