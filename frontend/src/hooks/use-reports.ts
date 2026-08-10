"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { DashboardStats, ReportData, ActivityData } from "@/types";

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get<DashboardStats>("/dashboard/stats"),
  });
}

export function useReportData() {
  return useQuery<ReportData[]>({
    queryKey: ["report-data"],
    queryFn: () => api.get<ReportData[]>("/reports/app-summary"),
  });
}

export function useActivityData(days = 7) {
  return useQuery<ActivityData[]>({
    queryKey: ["activity-data", days],
    queryFn: () => api.get<ActivityData[]>("/reports/activity", { params: { days: String(days) } }),
  });
}
