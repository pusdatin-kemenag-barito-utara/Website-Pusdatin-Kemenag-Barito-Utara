import { Metadata } from "next";
import { db } from "@/lib/drizzle";
import { eq } from "drizzle-orm";
import { satelliteApps } from "@/db/schema";
import { withRetry } from "@/lib/db-retry";
import { LayananClientContent } from "@/components/landing/LayananClientContent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Layanan Aplikasi Terintegrasi - PUSDATIN Kemenag Barito Utara",
};

export default async function LayananPage() {
  let apps: any[] = [];

  try {
    apps = await withRetry(
      () => db.query.satelliteApps.findMany({
        where: eq(satelliteApps.status, "online"),
        orderBy: (apps, { asc }) => [asc(apps.sortOrder)],
      }),
      2, "LANDING_LAYANAN"
    );
  } catch {
    // Abaikan jika error
  }

  return <LayananClientContent apps={apps} />;
}

