"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useApps } from "@/hooks/use-apps";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Monitor,
  Shield,
  BarChart3,
  LogOut,
  X,
  ChevronDown,
  ChevronUp,
  Database,
  Server,
} from "lucide-react";

const navItems = [
  { href: "/dashboard/apps", label: "Aplikasi", icon: Monitor },
  { href: "/dashboard/users", label: "Pengguna", icon: Users },
  { href: "/dashboard/audit", label: "Audit Log", icon: Shield },
  { href: "/dashboard/reports", label: "Laporan", icon: BarChart3 },
  { href: "/dashboard/infrastructure", label: "Infrastruktur", icon: Server },
];

interface SidebarProps {
  onClose?: () => void;
  onLogout?: () => void;
}

export function Sidebar({ onClose, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const appId = searchParams.get("appId");
  const { data: apps } = useApps();
  const [penggunaOpen, setPenggunaOpen] = useState(
    pathname.startsWith("/dashboard/users") || pathname.startsWith("/dashboard/pejabat")
  );

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-5">
        <Link href="/dashboard/apps" className="flex items-center gap-3">
          <img
            src="/branding/pusdatin.png"
            alt="PUSDATIN"
            className="h-9 w-auto object-contain"
          />
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-white">PUSDATIN</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Kemenag Barito Utara</p>
          </div>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href && !appId;
          const isPengguna = item.label === "Pengguna";

          if (isPengguna) {
            return (
              <div key={item.href} className="space-y-1">
                <button
                  onClick={() => setPenggunaOpen(!penggunaOpen)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    (pathname.startsWith(item.href) && !penggunaOpen && !appId)
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </div>
                  {penggunaOpen ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  )}
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    penggunaOpen ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0 mt-0"
                  )}
                >
                  <div className="overflow-hidden flex flex-col space-y-1 border-l border-slate-100 dark:border-slate-800 pl-3 ml-8">
                    <Link
                      href={`${item.href}?type=internal_admin`}
                      onClick={onClose}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm font-medium transition-colors truncate",
                        searchParams.get("type") === "internal_admin" || (!searchParams.get("type") && !appId)
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      )}
                    >
                      Admin Internal
                    </Link>
                    <Link
                      href={`${item.href}?type=internal_pegawai`}
                      onClick={onClose}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm font-medium transition-colors truncate",
                        searchParams.get("type") === "internal_pegawai"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      )}
                    >
                      Pegawai (PTSP)
                    </Link>
                    <Link
                      href={`${item.href}?type=eksternal_masyarakat`}
                      onClick={onClose}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm font-medium transition-colors truncate",
                        searchParams.get("type") === "eksternal_masyarakat"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      )}
                    >
                      Masyarakat Umum
                    </Link>
                    <Link
                      href={`/dashboard/pejabat`}
                      onClick={onClose}
                      className={cn(
                        "rounded-md px-3 py-2 text-sm font-medium transition-colors truncate",
                        pathname.startsWith("/dashboard/pejabat")
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      )}
                    >
                      Manajemen Pejabat
                    </Link>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                (pathname === item.href || (pathname.startsWith(item.href + "/") && !appId))
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 dark:border-slate-800 p-3 lg:hidden">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Keluar
        </button>
      </div>
    </div>
  );
}
