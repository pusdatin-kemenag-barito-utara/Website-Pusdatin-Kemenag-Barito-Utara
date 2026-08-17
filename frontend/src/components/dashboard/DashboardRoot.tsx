import { Component, ReactNode, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastContainer } from "@/components/ui/Toast";
import { useUIStore } from "@/stores/ui-store";
import { AppShell } from "@/components/layout/AppShell";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[DASHBOARD REACT ERROR]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto my-12 bg-red-50 border border-red-200 rounded-2xl text-red-800 space-y-4">
          <h2 className="text-xl font-bold">Terjadi Kesalahan Tampilan Dasbor</h2>
          <p className="font-mono text-sm bg-white p-4 rounded border border-red-100 overflow-x-auto">
            {this.state.error?.message || "Unknown rendering error"}
          </p>
          <pre className="text-xs text-red-600 overflow-x-auto max-h-48 whitespace-pre-wrap">
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Muat Ulang Halaman
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import { AppsPage } from "@/components/dashboard/pages/apps";
import { AuditPage } from "@/components/dashboard/pages/audit";
import { InfrastructurePage } from "@/components/dashboard/pages/infrastructure";
import { PejabatPage } from "@/components/dashboard/pages/pejabat";
import { ReportsPage } from "@/components/dashboard/pages/reports";
import { UsersPage } from "@/components/dashboard/pages/users";
import { NewUserPage } from "@/components/dashboard/pages/users-new";
import { UserDetailPage } from "@/components/dashboard/pages/users-detail";
import { AnnouncementsPage } from "@/components/dashboard/pages/announcements";

function DashboardRoutes() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-8 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />
        </div>
      }
    >
      <Routes>
        <Route path="/dashboard" element={<Navigate to="/dashboard/apps" replace />} />
        <Route path="/dashboard/apps" element={<AppsPage />} />
        <Route path="/dashboard/announcements" element={<AnnouncementsPage />} />
        <Route path="/dashboard/pejabat" element={<PejabatPage />} />
        <Route path="/dashboard/infrastructure" element={<InfrastructurePage />} />
        <Route path="/dashboard/reports" element={<ReportsPage />} />
        <Route path="/dashboard/audit" element={<AuditPage />} />
        <Route path="/dashboard/users" element={<UsersPage />} />
        <Route path="/dashboard/users/new" element={<NewUserPage />} />
        <Route path="/dashboard/users/:id" element={<UserDetailPage />} />
        <Route path="*" element={<Navigate to="/dashboard/apps" replace />} />
      </Routes>
    </Suspense>
  );
}

export function DashboardRoot() {
  const { isDark } = useUIStore();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30000,
            retry: 1,
          },
        },
      }),
  );

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppShell>
            <DashboardRoutes />
          </AppShell>
        </BrowserRouter>
        <ToastContainer />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
