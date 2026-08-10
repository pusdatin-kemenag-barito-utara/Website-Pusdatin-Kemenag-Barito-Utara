"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, Variants } from "framer-motion";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";

interface LandingHeroContentProps {
  stats: {
    totalAppsCount: number;
    layananMasyarakat: number;
    layananPegawai: number;
    totalAdmin: number;
    totalPegawai: number;
    totalMasyarakat: number;
  };
}

export function LandingHeroContent({ stats }: LandingHeroContentProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 24, scale: 0.96 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  const statsBarVariants: Variants = {
    hidden: { opacity: 0, y: 32 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delay: 0.5,
        ease: "easeOut",
      },
    },
  };

  const statItemVariants = {
    hidden: { opacity: 0, scale: 0.85 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.4,
      },
    },
  };

  return (
    <>
      {/* Main Hero Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 flex-1 flex flex-col items-center justify-center text-center my-auto"
      >
        {/* Logo */}
        <motion.img
          variants={itemVariants}
          src="/branding/pusdatin.png"
          alt="Logo PUSDATIN"
          className="h-20 w-auto sm:h-24 mb-4 drop-shadow-2xl object-contain"
        />

        {/* Title */}
        <motion.h1
          variants={itemVariants}
          className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-2 pb-2 leading-tight drop-shadow-lg bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent"
        >
          Pusat Data dan Teknologi Informasi
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="text-base sm:text-lg font-medium text-emerald-400 mb-3 drop-shadow"
        >
          Kementerian Agama Kabupaten Barito Utara
        </motion.p>

        {/* Description */}
        <motion.p
          variants={itemVariants}
          className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed mb-6"
        >
          Sistem manajemen data master dan autentikasi terpusat untuk seluruh aplikasi layanan Kemenag Barito Utara.
        </motion.p>

        {/* Buttons */}
        <motion.div variants={itemVariants} className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/layanan"
            className="inline-flex items-center gap-2 bg-[#006838] hover:bg-[#005530] text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-emerald-950/50 hover:scale-[1.02] active:scale-[0.98]"
          >
            Lihat Layanan Aplikasi
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/profil"
            className="inline-flex items-center gap-2 border border-slate-700/80 bg-slate-900/60 backdrop-blur-md text-slate-200 hover:text-white font-medium text-xs sm:text-sm px-5 py-2.5 rounded-lg hover:bg-slate-800/80 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Tentang PUSDATIN
          </Link>
        </motion.div>
      </motion.div>

      {/* Integrated Floating Stats Bar (Frosted Glass with Stagger Animation) */}
      <motion.div
        variants={statsBarVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-6xl mx-auto mt-8"
      >
        <div className="rounded-2xl bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 p-4 sm:p-6 shadow-2xl shadow-slate-950/80">
          <motion.div
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.08,
                  delayChildren: 0.6,
                },
              },
            }}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-6 text-center"
          >
            {[
              { label: "Sistem Integrasi", value: stats.totalAppsCount },
              { label: "Layanan Masyarakat", value: stats.layananMasyarakat },
              { label: "Layanan Pegawai", value: stats.layananPegawai },
              { label: "Administrator", value: stats.totalAdmin },
              { label: "Pegawai Terdaftar", value: stats.totalPegawai },
              { label: "Masyarakat", value: stats.totalMasyarakat },
            ].map((item, i) => (
              <motion.div
                key={i}
                variants={statItemVariants}
                className="p-2.5 sm:p-0 rounded-xl bg-slate-800/40 sm:bg-transparent border border-slate-800/60 sm:border-0"
              >
                <div className="text-xl sm:text-3xl font-extrabold text-emerald-400 tracking-tight">
                  <AnimatedCounter value={item.value} />
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 font-semibold mt-1 uppercase tracking-wider">
                  {item.label}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}
