import { ArrowRight } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

interface LandingHeroContentProps {
  stats: {
    totalAppsCount: number;
    onlineAppsCount?: number;
    totalAnnouncements?: number;
    superAdminCount?: number;
    systemHealthPercent?: number;
  };
}

export function LandingHeroContent({ stats }: LandingHeroContentProps) {
  const safeStats = {
    totalAppsCount: stats?.totalAppsCount || 11,
    onlineAppsCount: stats?.onlineAppsCount || stats?.totalAppsCount || 11,
    totalAnnouncements: stats?.totalAnnouncements || 3,
    superAdminCount: stats?.superAdminCount || 1,
    systemHealthPercent: stats?.systemHealthPercent || 100,
  };

  return (
    <>
      {/* Main Hero Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center my-auto">
        {/* Logo */}
        <img
          src="/branding/pusdatin.png"
          alt="Logo PUSDATIN"
          fetchPriority="high"
          className="h-20 w-auto sm:h-24 mb-4 drop-shadow-2xl object-contain"
        />

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-2 pb-2 leading-tight drop-shadow-lg bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
          Pusat Data dan Teknologi Informasi
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg font-medium text-emerald-400 mb-3 drop-shadow">
          Kementerian Agama Kabupaten Barito Utara
        </p>

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed mb-6">
          Pusat monitoring, integrasi aplikasi layanan publik dan internal, serta pengumuman resmi Kementerian Agama Kabupaten Barito Utara.
        </p>

        {/* Buttons */}
        <div className="flex flex-wrap gap-3 justify-center">
          <a
            href="/layanan"
            className="inline-flex items-center gap-2 bg-[#006838] hover:bg-[#005530] text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-emerald-950/50 hover:scale-[1.02] active:scale-[0.98]"
          >
            Lihat Layanan Aplikasi
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/profil"
            className="inline-flex items-center gap-2 border border-slate-700/80 bg-slate-900/60 backdrop-blur-md text-slate-200 hover:text-white font-medium text-xs sm:text-sm px-5 py-2.5 rounded-lg hover:bg-slate-800/80 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Tentang PUSDATIN
          </a>
        </div>
      </div>

      {/* Integrated Floating Stats Bar */}
      <div className="relative z-10 w-full max-w-6xl mx-auto mt-8">
        <div className="rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 p-4 sm:p-6 shadow-2xl shadow-slate-950/80">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6 text-center">
            {[
              { label: "Sistem Terintegrasi", value: safeStats.totalAppsCount },
              { label: "Aplikasi Online", value: safeStats.onlineAppsCount },
              { label: "Pengumuman Resmi", value: safeStats.totalAnnouncements },
              { label: "Super Admin", value: safeStats.superAdminCount },
              { label: "Keandalan Sistem (%)", value: safeStats.systemHealthPercent },
            ].map((item, i) => (
              <div
                key={i}
                className="p-2.5 sm:p-0 rounded-xl bg-slate-800/40 sm:bg-transparent border border-slate-800/60 sm:border-0 transition-all duration-300 hover:scale-105"
              >
                <div className="text-xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
                  <AnimatedCounter value={item.value} />
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 font-semibold mt-1 uppercase tracking-wider">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
