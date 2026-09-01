import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface BackupFileItem {
  key: string;
  fileName: string;
  size: number;
  lastModified: string;
  downloadUrl: string;
}

export interface BackupSchemaSummary {
  schemaName: string;
  tableCount: number;
  tables: string[];
  rowCount: number;
  byteSize: number;
  fileName: string;
}

export interface BackupManifest {
  id: string;
  folder: string;
  timestamp: string;
  totalSchemas: number;
  totalTables: number;
  totalRows: number;
  totalBytes: number;
  durationMs: number;
  status: string;
  triggeredBy: string;
  schemas: BackupSchemaSummary[];
  fullDumpFile: string;
  checksumSha256?: string;
}

export interface BackupSnapshot {
  folder: string;
  timestamp: string;
  totalSchemas: number;
  totalTables: number;
  totalRows: number;
  totalBytes: number;
  triggeredBy: string;
  status: string;
  files: BackupFileItem[];
  manifest?: BackupManifest | null;
}

export interface BackupSystemStatus {
  schedulerActive: boolean;
  scheduleTime: string;
  nextRun: string;
  lastBackupAt?: string | null;
  lastBackupState?: string | null;
  totalSnapshots: number;
  targetBucket: string;
  isRunning: boolean;
  latestManifest?: BackupManifest | null;
}

export function useBackupStatus() {
  return useQuery<BackupSystemStatus>({
    queryKey: ["backup-status"],
    queryFn: () => api.get<BackupSystemStatus>("/backup/status"),
    refetchInterval: (query) => (query.state.error ? false : query.state.data?.isRunning ? 2000 : 15000),
    retry: false,
  });
}

export function useBackupHistory() {
  return useQuery<{ success: boolean; snapshots: BackupSnapshot[] }>({
    queryKey: ["backup-history"],
    queryFn: () => api.get<{ success: boolean; snapshots: BackupSnapshot[] }>("/backup/history"),
    refetchInterval: (query) => (query.state.error ? false : 30000),
    retry: false,
  });
}

export function useTriggerBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ message: string; manifest: BackupManifest }>("/backup/trigger", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backup-status"] });
      qc.invalidateQueries({ queryKey: ["backup-history"] });
    },
  });
}

export function useDeleteBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (folder: string) => api.delete<{ message: string }>(`/backup/snapshots?folder=${encodeURIComponent(folder)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backup-status"] });
      qc.invalidateQueries({ queryKey: ["backup-history"] });
    },
  });
}

export function usePruneBackups() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (days?: number) =>
      api.post<{ message: string; deleted: number }>(`/backup/prune?days=${days || 3}`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backup-status"] });
      qc.invalidateQueries({ queryKey: ["backup-history"] });
    },
  });
}
