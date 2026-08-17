import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Announcement } from "@/types";

export function useAnnouncements(search?: string) {
  return useQuery<Announcement[]>({
    queryKey: ["announcements", search || ""],
    queryFn: async () => {
      const url = search 
        ? `/announcements/admin?search=${encodeURIComponent(search)}` 
        : "/announcements/admin";
      const res = await api.get<any>(url);
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
  });
}

export function usePublicAnnouncements() {
  return useQuery<Announcement[]>({
    queryKey: ["public-announcements"],
    queryFn: async () => {
      const res = await api.get<any>("/announcements");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Announcement>) => api.post<Announcement>("/announcements", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["public-announcements"] });
    },
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Announcement> }) =>
      api.put<Announcement>(`/announcements/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["public-announcements"] });
    },
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/announcements/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
      qc.invalidateQueries({ queryKey: ["public-announcements"] });
    },
  });
}
