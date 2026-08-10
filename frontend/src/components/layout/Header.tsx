"use client";

import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";
import { Menu, LogOut, Moon, Sun, ChevronDown } from "lucide-react";

export function Header() {
  const { toggleSidebar, isDark, toggleTheme } = useUIStore();
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <button
          onClick={toggleSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <Dropdown
            trigger={
              <button className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-left">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                  <img
                    src="/branding/pusdatin.png"
                    alt="PUSDATIN"
                    className="h-5 w-auto object-contain"
                  />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-slate-700 leading-tight dark:text-slate-200">
                    {user?.name || "Memuat..."}
                  </p>
                  <p className="text-xs text-slate-500 leading-tight dark:text-slate-400">
                    {user?.email || "..."}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
            }
            items={[
              {
                label: "Keluar",
                icon: <LogOut className="h-4 w-4" />,
                onClick: handleLogout,
                danger: true,
              },
            ]}
          />
        </div>
      </div>
    </header>
  );
}
