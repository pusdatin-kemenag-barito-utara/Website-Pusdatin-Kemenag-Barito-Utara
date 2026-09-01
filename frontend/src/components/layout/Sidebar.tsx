
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Monitor,
  Shield,
  BarChart3,
  LogOut,
  X,
  Server,
  Megaphone,
  Database,
} from "lucide-react";

const navItems = [
  { href: "/dashboard/apps", label: "Aplikasi", icon: Monitor },
  { href: "/dashboard/announcements", label: "Pengumuman", icon: Megaphone },
  { href: "/dashboard/audit", label: "Audit Log", icon: Shield },
  { href: "/dashboard/reports", label: "Laporan", icon: BarChart3 },
  { href: "/dashboard/infrastructure", label: "Infrastruktur", icon: Server },
  { href: "/dashboard/backup", label: "Backup Database", icon: Database },
];

interface SidebarProps {
  onClose?: () => void;
  onLogout?: () => void;
}

export function Sidebar({ onClose, onLogout }: SidebarProps) {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const appId = searchParams.get("appId");

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-5">
        <Link to="/dashboard/apps" className="flex items-center gap-3">
          <img
            src="/branding/pusdatin.png"
            alt="Logo PUSDATIN"
            width={36}
            height={36}
            decoding="async"
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
            aria-label="Tutup Sidebar Menu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === item.href || (pathname.startsWith(item.href + "/") && !appId)
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        ))}
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
