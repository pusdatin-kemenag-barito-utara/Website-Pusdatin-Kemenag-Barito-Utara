import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/drizzle";
import { satelliteApps } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Since Next.js 15, params is a Promise. Our version is 16.2.3.
) {
  try {
    const { id } = await params;

    const [app] = await db
      .select({ status: satelliteApps.status })
      .from(satelliteApps)
      .where(eq(satelliteApps.id, id));

    if (!app) {
      console.log(`[PUBLIC APPS STATUS] App not found for ID: '${id}'`);
      return NextResponse.json({ status: "online", _debug: "not_found", requestedId: id }, { headers: corsHeaders }); // Fallback for unknown apps
    }

    return NextResponse.json({ status: app.status }, { headers: corsHeaders });
  } catch (err) {
    console.error("[PUBLIC APPS STATUS] GET error:", err);
    return NextResponse.json({ status: "online", _debug: "error", message: err instanceof Error ? err.message : String(err) }, { headers: corsHeaders }); // Fallback on error to not break apps
  }
}
