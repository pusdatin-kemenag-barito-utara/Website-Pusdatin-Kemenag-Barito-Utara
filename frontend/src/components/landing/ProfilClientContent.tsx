"use client";

import { motion, Variants } from "framer-motion";
import { 
  Database, 
  KeyRound, 
  BarChart3, 
  AppWindow, 
  Target, 
  Compass, 
  CheckCircle2, 
  Building2 
} from "lucide-react";

const servicesList = [
  {
    icon: Database,
    title: "Master Data & Integrasi",
    desc: "Single Source of Truth untuk seluruh data pegawai, pemohon, dan aset digital Kementerian Agama Kabupaten Barito Utara.",
    badge: "Core Data",
    color: "from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
  },
  {
    icon: KeyRound,
    title: "Autentikasi Terpusat (SSO)",
    desc: "Akses sekali login yang aman untuk seluruh aplikasi layanan publik dan internal tanpa perlu mengingat banyak kredensial.",
    badge: "Keamanan",
    color: "from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
  },
  {
    icon: BarChart3,
    title: "Monitoring Real-Time",
    desc: "Dashboard eksekutif untuk memantau performa, trafik, dan laporan penggunaan aplikasi secara langsung.",
    badge: "Analitik",
    color: "from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
  },
  {
    icon: AppWindow,
    title: "Manajemen Aplikasi Satelit",
    desc: "Kontrol penuh status pemeliharaan, rilis versi, dan hak akses seluruh aplikasi terhubung dari satu tempat.",
    badge: "Ekosistem",
    color: "from-purple-500/10 to-pink-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
  }
];

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

export function ProfilClientContent() {
  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-[#006838] selection:text-white">
      
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
            Profil & Tata Kelola PUSDATIN
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Pusat Data dan Teknologi Informasi — penggerak utama transformasi digital, pengelola data master terpadu, dan infrastruktur autentikasi terpusat.
          </p>
        </motion.div>
      </section>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
        
        {/* Core Services Section */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center text-center max-w-xl mx-auto mb-10 space-y-2"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-[#006838] dark:text-emerald-400 bg-[#006838]/10 dark:bg-emerald-400/10 px-3 py-1 rounded-full">
              Fungsi & Layanan
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Infrastruktur Utama Pusdatin
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Pilar teknologi dalam ekosistem layanan digital Kementerian Agama Kabupaten Barito Utara.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {servicesList.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <motion.div
                  key={idx}
                  variants={itemVariants}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="group relative rounded-xl bg-white dark:bg-slate-900/80 p-6 border border-slate-200 dark:border-slate-800 hover:border-[#006838]/40 dark:hover:border-emerald-500/40 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-lg bg-gradient-to-br ${item.color} border shadow-sm`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 uppercase tracking-wider">
                        {item.badge}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-[#006838] dark:group-hover:text-emerald-400 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Visi Misi Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-2 gap-6 sm:gap-8"
        >
          {/* Visi Card */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/90 p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-[#006838]/10 dark:bg-emerald-500/10 text-[#006838] dark:text-emerald-400 border border-[#006838]/20 dark:border-emerald-500/20">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Visi PUSDATIN</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Terwujudnya tata kelola data dan informasi keagamaan yang terintegrasi, transparan, aman, dan andal di lingkungan Kementerian Agama Kabupaten Barito Utara.
              </p>
            </div>
          </div>

          {/* Misi Card */}
          <div className="rounded-2xl bg-white dark:bg-slate-900/90 p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Misi Strategis</h3>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#006838] dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Mengembangkan dan mengelola infrastruktur Single Sign-On (SSO) terpadu.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#006838] dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Menjamin keamanan, validitas, dan aksesibilitas data master keagamaan.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#006838] dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>Memberikan dukungan IT dan pengaduan layanan yang responsif dan solutif.</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
