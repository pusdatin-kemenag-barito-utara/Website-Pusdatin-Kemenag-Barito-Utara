
import { motion, Variants } from "framer-motion";
import { ArrowUpRight, AppWindow, Building2 } from "lucide-react";
import { trackAppClick } from "@/lib/analytics";

interface LayananClientContentProps {
  apps: any[];
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

const parseIconUrl = (iconStr: string | null) => {
  if (!iconStr) return { url: "", scale: 100 };
  const [url, query] = iconStr.split("?");
  let scale = 100;
  if (query) {
    const params = new URLSearchParams(query);
    if (params.has("scale")) {
      scale = parseInt(params.get("scale")!, 10);
    }
  }
  return { url, scale };
};

export function LayananClientContent({ apps }: LayananClientContentProps) {
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
            Layanan Aplikasi Terintegrasi
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Portal akses resmi menuju sistem informasi publik dan portal aplikasi internal Kementerian Agama Kabupaten Barito Utara.
          </p>
        </motion.div>
      </section>

      {/* App List Content Grid */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center max-w-xl mx-auto mb-10 space-y-2"
        >
          <span className="text-xs font-bold uppercase tracking-widest text-[#006838] dark:text-emerald-400 bg-[#006838]/10 dark:bg-emerald-400/10 px-3 py-1 rounded-full">
            Daftar Sistem & Portal
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Aplikasi Satelit Terkoneksi
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Akses langsung ke seluruh layanan digital dalam ekosistem SSO Pusdatin.
          </p>
        </motion.div>

        {apps.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {apps.map((app) => {
              const isMaintenance = app.status === 'maintenance';
              return (
                <motion.div
                  key={app.id}
                  variants={itemVariants}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className={`group relative rounded-xl bg-white dark:bg-slate-900/80 p-6 border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all duration-200 flex flex-col justify-between ${
                    isMaintenance
                      ? "hover:border-amber-500/40 dark:hover:border-amber-500/40"
                      : "hover:border-[#006838]/40 dark:hover:border-emerald-500/40"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-lg border shadow-sm overflow-hidden transition-colors ${
                          isMaintenance
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500/20"
                            : "bg-emerald-500/10 border-emerald-500/20 text-[#006838] dark:text-emerald-400 group-hover:bg-[#006838]/10"
                        }`}
                      >
                        {(() => {
                          const iconData = parseIconUrl(app.icon);
                          return iconData.url ? (
                            <img 
                              src={iconData.url} 
                              alt={app.name || "Logo Aplikasi"} 
                              width={32} 
                              height={32} 
                              loading="lazy" 
                              decoding="async" 
                              style={{ transform: `scale(${iconData.scale / 100})` }}
                              className="h-8 w-8 object-contain drop-shadow-sm transition-transform" 
                            />
                          ) : (
                            <AppWindow className="h-6 w-6" />
                          );
                        })()}
                      </div>
                      {isMaintenance ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Maintenance
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Online
                        </span>
                      )}
                    </div>

                    <h3
                      className={`mt-5 font-bold text-slate-900 dark:text-white text-base transition-colors ${
                        isMaintenance
                          ? "group-hover:text-amber-600 dark:group-hover:text-amber-400"
                          : "group-hover:text-[#006838] dark:group-hover:text-emerald-400"
                      }`}
                    >
                      {app.name}
                    </h3>

                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {app.description || "Aplikasi layanan terintegrasi dalam ekosistem SSO PUSDATIN Kemenag Barito Utara."}
                    </p>
                  </div>

                  {app.url && (
                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                      {isMaintenance ? (
                        <a
                          href={`/maintenance?app=${encodeURIComponent(app.name)}`}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-900/50 px-4 py-2.5 text-xs font-semibold text-amber-800 dark:text-amber-300 transition-all duration-200 shadow-sm"
                        >
                          Sedang Pemeliharaan <ArrowUpRight className="h-4 w-4" />
                        </a>
                      ) : (
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() =>
                            trackAppClick({
                              id: app.id,
                              name: app.name,
                              url: app.url,
                              schemaName: app.schemaName,
                            })
                          }
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#006838] dark:hover:bg-[#006838] px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-white dark:hover:text-white transition-all duration-200 shadow-sm"
                        >
                          Akses Aplikasi <ArrowUpRight className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800">
            <AppWindow className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Belum ada aplikasi yang dikonfigurasi secara publik.
            </p>
          </div>
        )}
      </section>

    </div>
  );
}
