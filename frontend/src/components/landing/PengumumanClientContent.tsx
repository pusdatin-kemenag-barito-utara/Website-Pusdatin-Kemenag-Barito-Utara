"use client";

import { motion, Variants } from "framer-motion";
import { Calendar, ArrowUpRight, CheckCircle2, Building2, MessageSquare } from "lucide-react";

interface Announcement {
  id: number;
  tag: string;
  date: string;
  title: string;
  desc: string;
  isImportant: boolean;
}

interface PengumumanClientContentProps {
  announcements: Announcement[];
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

export function PengumumanClientContent({ announcements }: PengumumanClientContentProps) {
  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-[#006838] selection:text-white">
      
      {/* Hero Header Section */}
      <section className="relative py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,104,56,0.06),transparent_60%)] pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="max-w-4xl mx-auto text-center relative z-10 space-y-4"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#006838]/10 dark:bg-emerald-500/10 border border-[#006838]/20 dark:border-emerald-500/20 text-[#006838] dark:text-emerald-400 text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5" />
            Kementerian Agama Kabupaten Barito Utara
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Pengumuman & Informasi Kebijakan
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Informasi resmi mengenai rilis fitur baru, pemeliharaan berkala, dan panduan teknis layanan PUSDATIN Kemenag Barito Utara.
          </p>
        </motion.div>
      </section>

      {/* Announcements Stream Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
        
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center max-w-xl mx-auto mb-10 space-y-2"
        >
          <span className="text-xs font-bold uppercase tracking-widest text-[#006838] dark:text-emerald-400 bg-[#006838]/10 dark:bg-emerald-400/10 px-3 py-1 rounded-full">
            Warta & Informasi Kebijakan
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Pengumuman Terkini
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Kumpulan pemberitahuan penting dan update sistem terpusat.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4 sm:space-y-5"
        >
          {announcements.map((item) => (
            <motion.div
              key={item.id}
              variants={itemVariants}
              whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
              className={`group rounded-xl p-6 sm:p-7 border transition-all duration-200 ${
                item.isImportant
                  ? "bg-white dark:bg-slate-900/90 border-[#006838]/40 dark:border-emerald-500/40 shadow-sm"
                  : "bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-bold px-3 py-1 rounded-md bg-[#006838]/10 dark:bg-emerald-500/10 text-[#006838] dark:text-emerald-400 border border-[#006838]/20 dark:border-emerald-500/20">
                    {item.tag}
                  </span>
                  {item.isImportant && (
                    <span className="text-xs font-semibold text-[#006838] dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#006838] dark:text-emerald-400" /> Informasi Utama
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{item.date}</span>
                </div>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#006838] dark:group-hover:text-emerald-400 transition-colors mb-2">
                {item.title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* WhatsApp Helpdesk Callout Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-10 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-[#006838]/10 dark:bg-emerald-500/10 text-[#006838] dark:text-emerald-400 border border-[#006838]/20 dark:border-emerald-500/20 shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div className="space-y-1 text-center sm:text-left">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Ada Kendala Layanan Teknis?</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tim IT Helpdesk PUSDATIN siap mendampingi operasional Anda.</p>
            </div>
          </div>
          <a
            href="https://wa.me/6285117491212"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#006838] hover:bg-[#005530] text-white text-xs font-semibold shrink-0 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            Konsultasi WhatsApp IT
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </motion.div>
      </section>

    </div>
  );
}
