import Link from "next/link";
import { db } from "@/lib/drizzle";
import { satelliteApps, profiles, ptspServices, ptspServiceItems, profilesPegawai, profilesPemohon } from "@/db/schema";
import { withRetry } from "@/lib/db-retry";
import { eq, and, inArray } from "drizzle-orm";
import { HeroThreeBackground } from "@/components/landing/HeroThreeBackground";
import { LandingHeroContent } from "@/components/landing/LandingHeroContent";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Beranda - Pusat Data dan Teknologi Informasi Kemenag Kabupaten Barito Utara",
  description: "Portal resmi PUSDATIN Kemenag Kabupaten Barito Utara. Layanan autentikasi SSO terpusat, pengaduan publik, dan integrasi seluruh aplikasi keagamaan.",
  alternates: {
    canonical: "/",
  },
};

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  let totalAppsCount = 0;
  let layananMasyarakat = 0;
  let layananPegawai = 0;
  let totalAdmin = 0;
  let totalPegawai = 0;
  let totalMasyarakat = 0;

  try {
    const allApps = await withRetry(
      () => db.select().from(satelliteApps),
      2, "LANDING_STATS_APPS"
    );
    totalAppsCount = allApps.length;

    const allServiceItems = await withRetry(
      () => db.select({ categoryId: ptspServices.category })
      .from(ptspServiceItems)
      .innerJoin(ptspServices, eq(ptspServiceItems.serviceId, ptspServices.id))
      .where(and(eq(ptspServiceItems.isActive, true), eq(ptspServices.isActive, true))),
      2, "LANDING_STATS_SERVICES"
    );
    layananMasyarakat = allServiceItems.filter(s => s.categoryId === 'public').length;
    layananPegawai = allServiceItems.filter(s => s.categoryId === 'asn').length;

    const allAdmins = await withRetry(
      () => db.select({ id: profiles.id }).from(profiles).where(inArray(profiles.role, ['super_admin', 'admin', 'sub_admin'])),
      2, "LANDING_STATS_ADMIN"
    );
    totalAdmin = allAdmins.length;

    const allPegawai = await withRetry(
      () => db.select({ id: profilesPegawai.id }).from(profilesPegawai),
      2, "LANDING_STATS_PEGAWAI"
    );
    totalPegawai = allPegawai.length;

    const allMasyarakat = await withRetry(
      () => db.select({ id: profilesPemohon.id }).from(profilesPemohon),
      2, "LANDING_STATS_PEMOHON"
    );
    totalMasyarakat = allMasyarakat.length;
  } catch (error) {
    // Abaikan jika error, card akan menampilkan 0
  }

  const stats = {
    totalAppsCount,
    layananMasyarakat,
    layananPegawai,
    totalAdmin,
    totalPegawai,
    totalMasyarakat,
  };

  return (
    <>
      {/* Hero Section with Three.js 3D Animated Background & Integrated Stats */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="relative min-h-[580px] sm:min-h-[640px] flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
          
          {/* Three.js Interactive 3D Canvas */}
          <HeroThreeBackground />

          {/* Framer Motion Animated Hero Content & Floating Stats Bar */}
          <LandingHeroContent stats={stats} />

        </div>
      </section>
    </>
  );
}
