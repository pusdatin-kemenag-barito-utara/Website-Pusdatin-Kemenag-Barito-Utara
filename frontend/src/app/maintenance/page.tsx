"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { Settings, Wrench, AlertTriangle, Clock } from "lucide-react";
import { useSearchParams } from "next/navigation";

function MaintenanceContent() {
  const searchParams = useSearchParams();
  const appName = searchParams.get("app") || "Sistem";

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-50 overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-emerald-500/10 blur-[80px]" />
      <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 mx-auto max-w-2xl px-6 py-12 text-center"
      >
        <div className="mb-8 flex justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100"
          >
            <Settings className="h-12 w-12 text-emerald-600" />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg"
            >
              <Wrench className="h-5 w-5" />
            </motion.div>
          </motion.div>
        </div>

        <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Sistem Sedang Pemeliharaan
        </h1>
        
        <p className="mb-8 text-lg text-slate-600">
          Aplikasi <strong>{appName}</strong> saat ini sedang dalam mode perbaikan terpusat oleh Tim Pusdatin Kemenag Barito Utara. Kami sedang melakukan peningkatan sistem untuk memberikan pengalaman yang lebih baik.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 border border-amber-200/50">
            <AlertTriangle className="h-4 w-4" />
            Akses Sementara Ditutup
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 border border-emerald-200/50">
            <Clock className="h-4 w-4" />
            Silakan periksa kembali nanti
          </div>
        </div>

        <div className="mt-12 text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Pusdatin Kemenag Barito Utara
        </div>
      </motion.div>
    </div>
  );
}

export default function MaintenancePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Wrench className="h-8 w-8 text-amber-500 animate-spin" /></div>}>
      <MaintenanceContent />
    </Suspense>
  );
}
