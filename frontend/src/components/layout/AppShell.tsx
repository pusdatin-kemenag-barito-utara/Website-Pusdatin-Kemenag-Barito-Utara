import { useEffect, useRef } from "react";

import { useUIStore } from "@/stores/ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const { isAuthenticated, isLoading, setAuth, clearAuth, setLoading } = useAuthStore();
  const hasFetched = useRef(false);

  useEffect(() => {
    // Run session check exactly once on mount
    if (hasFetched.current) return;
    hasFetched.current = true;

    const checkSession = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("pusdatin_token");
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch("/api/auth/session", { headers, credentials: "include" });
        const data = await res.json();
        if (data.authenticated && data.user) {
          setAuth(data.user, token || "");
        } else {
          clearAuth();
          localStorage.removeItem("pusdatin_token");
          window.location.assign("/login");
        }
      } catch {
        clearAuth();
        localStorage.removeItem("pusdatin_token");
        window.location.assign("/login");
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    try {
      localStorage.removeItem("pusdatin_token");
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } finally {
      clearAuth();
      window.location.assign("/");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Memuat Sesi Dasbor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 lg:flex">
      <aside className="hidden lg:block lg:w-64 lg:shrink-0">
        <div className="sticky top-0 h-screen border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <Sidebar onLogout={handleLogout} />
        </div>
      </aside>

      <div 
        className={cn(
          "fixed inset-0 z-50 lg:hidden transition-all duration-300",
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          aria-label="Close sidebar"
        />
        <div 
          className={cn(
            "relative flex h-full w-[280px] flex-col border-r border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 transition-transform duration-300 ease-in-out",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar onClose={() => setSidebarOpen(false)} onLogout={handleLogout} />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <Header />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
