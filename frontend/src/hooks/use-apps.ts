
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { SateliteApp, SystemHealth } from "@/types";

export function useApps() {
  return useQuery<SateliteApp[]>({
    queryKey: ["apps"],
    queryFn: async () => {
      const res = await api.get<any>("/apps");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
  });
}

export function useToggleMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: SateliteApp["status"] }) =>
      api.put<SateliteApp>(`/apps/${appId}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apps"] }),
  });
}

export function useBulkToggleMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ status }: { status: SateliteApp["status"] }) =>
      api.post<{ message: string }>(`/apps/bulk-status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apps"] }),
  });
}

export function useUpdateApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ appId, data }: { appId: string; data: Partial<SateliteApp> }) =>
      api.patch<{ message: string }>(`/apps/${appId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apps"] }),
  });
}

export function useSystemHealth() {
  return useQuery<SystemHealth>({
    queryKey: ["system-health"],
    queryFn: () => api.get<SystemHealth>("/system/health"),
    refetchInterval: (query) => (query.state.error ? false : 10000),
    retry: false,
  });
}

export function useCreateApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SateliteApp>) => api.post<SateliteApp>("/apps", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apps"] }),
  });
}

export function useDeleteApp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (appId: string) => api.delete<{ message: string }>(`/apps/${appId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apps"] }),
  });
}

