"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AuditLog } from "@/types";

interface AuditFilters {
  page?: number;
  limit?: number;
  action?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  targetSchema?: string;
}

export function useAuditLogs(filters?: AuditFilters) {
  return useQuery<{ data: AuditLog[]; total: number }>({
    queryKey: ["audit-logs", filters],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (filters?.page) params.page = String(filters.page);
      if (filters?.limit) params.limit = String(filters.limit);
      if (filters?.action) params.action = filters.action;
      if (filters?.startDate) params.startDate = filters.startDate;
      if (filters?.endDate) params.endDate = filters.endDate;
      if (filters?.search) params.search = filters.search;
      if (filters?.targetSchema) params.targetSchema = filters.targetSchema;
      return api.get("/audit-logs", { params });
    },
  });
}

export function useDeleteAuditLogs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetSchema?: string) => {
      const params: Record<string, string> = {};
      if (targetSchema) {
        params.targetSchema = targetSchema;
      }
      return api.delete("/audit-logs", { params });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });
}
