import { NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);

    return NextResponse.json(
      { status: "ok", timestamp: new Date().toISOString() },
      { status: 200 },
    );
  } catch (err) {
    console.error("[HEALTHCHECK] Database error:", err);

    return NextResponse.json(
      { status: "error", message: "Database unreachable", timestamp: new Date().toISOString() },
      { status: 503 },
    );
  }
}
