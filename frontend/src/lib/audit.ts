import { db } from "./drizzle";
import { auditLogs } from "../db/schema";

export async function recordAudit(params: {
  action: "INSERT" | "UPDATE" | "DELETE";
  target: string;
  targetSchema: string;
  performedBy: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  ip?: string;
}) {
  try {
    await db.insert(auditLogs).values({
      action: params.action,
      target: params.target,
      targetSchema: params.targetSchema,
      performedBy: params.performedBy,
      beforeState: params.beforeState ?? null,
      afterState: params.afterState ?? null,
      ip: params.ip ?? null,
    });
  } catch (err) {
    console.error("[AUDIT] Failed to record:", err);
  }
}
