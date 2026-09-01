import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Badge } from "@/components/ui/Badge";
import { AuditTable } from "@/components/audit/AuditTable";
import { AuditFilters } from "@/components/audit/AuditFilters";
import { useAuditLogs, useDeleteAuditLogs, useDeleteAuditLogsBatch } from "@/hooks/use-audit";
import { useApps } from "@/hooks/use-apps";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Trash2, CheckSquare, X } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import type { AuditLog } from "@/types";

export function AuditPage() {
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [schemaTab, setSchemaTab] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBatchDeleteDialogOpen, setIsBatchDeleteDialogOpen] = useState(false);

  const deleteMutation = useDeleteAuditLogs();
  const deleteBatchMutation = useDeleteAuditLogsBatch();

  const { data: apps } = useApps();

  // Reset selected rows when switching tabs or filters
  useEffect(() => {
    setSelectedIds([]);
  }, [schemaTab, action, search]);

  const { data, isLoading } = useAuditLogs({
    action: action || undefined,
    search: search || undefined,
    targetSchema: schemaTab || undefined,
    limit: 50,
  });

  const currentLogIds = (data?.data || []).map((l) => l.id);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (currentLogIds.length === 0) return;
    const isAllSelected = currentLogIds.every((id) => selectedIds.includes(id));
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentLogIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentLogIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleResetFilters = () => {
    setSchemaTab("");
    setAction("");
    setSearch("");
    setSelectedIds([]);
  };

  const selectedAppName = schemaTab
    ? apps?.find((a) => (a.schemaName || a.id) === schemaTab)?.name || schemaTab
    : "Semua Aplikasi";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Audit Log Sistem</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              {data?.total || 0} Total Log
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Pusat pemantauan audit trail, perubahan data, dan log aktivitas seluruh ekosistem layanan.
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {selectedIds.length > 0 && (
            <Button
              variant="danger"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setIsBatchDeleteDialogOpen(true)}
              loading={deleteBatchMutation.isPending}
            >
              Hapus {selectedIds.length} Terpilih
            </Button>
          )}
          <Button
            variant="outline"
            icon={<Trash2 className="h-4 w-4 text-red-500" />}
            onClick={() => setIsDeleteDialogOpen(true)}
            loading={deleteMutation.isPending}
          >
            Hapus Semua Log
          </Button>
        </div>
      </div>

      {/* Bulk Action Alert / Banner when items are selected */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between gap-4 p-4 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
              <CheckSquare className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-950 dark:text-emerald-200">
                {selectedIds.length} log audit terpilih
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Pilih aksi massal yang ingin Anda terapkan
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearSelection}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Batal
            </button>
            <Button
              size="sm"
              variant="danger"
              icon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={() => setIsBatchDeleteDialogOpen(true)}
              loading={deleteBatchMutation.isPending}
            >
              Hapus Massal ({selectedIds.length})
            </Button>
          </div>
        </div>
      )}

      {/* Main Table Card with Integrated Filter Toolbar */}
      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-200/80 dark:border-slate-800/80 py-4 px-5">
          <AuditFilters
            apps={apps || []}
            selectedSchema={schemaTab}
            onSchemaChange={setSchemaTab}
            action={action}
            search={search}
            onActionChange={setAction}
            onSearchChange={setSearch}
            onResetFilters={handleResetFilters}
          />
        </CardHeader>
        <CardBody className="p-0">
          <AuditTable
            data={data?.data || []}
            loading={isLoading}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onToggleSelectAll={handleToggleSelectAll}
            onRowClick={(log) => setSelectedLog(log)}
          />
        </CardBody>
      </Card>

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Detail Audit Log"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Waktu</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {formatDate(selectedLog.timestamp)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Aksi</p>
                <Badge
                  variant={
                    selectedLog.action === "INSERT"
                      ? "success"
                      : selectedLog.action === "DELETE"
                        ? "danger"
                        : "warning"
                  }
                >
                  {selectedLog.action}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Target</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {selectedLog.target}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Schema</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {selectedLog.targetSchema}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Oleh</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {selectedLog.performedBy}
                </p>
              </div>
            </div>

            {selectedLog.beforeState && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Before State</p>
                <pre className="overflow-auto rounded-lg bg-slate-50 dark:bg-slate-900 p-3 text-xs text-slate-600 dark:text-slate-400 max-h-40">
                  {JSON.stringify(selectedLog.beforeState, null, 2)}
                </pre>
              </div>
            )}
            {selectedLog.afterState && (
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">After State</p>
                <pre className="overflow-auto rounded-lg bg-slate-50 dark:bg-slate-900 p-3 text-xs text-slate-600 dark:text-slate-400 max-h-40">
                  {JSON.stringify(selectedLog.afterState, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Batch Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isBatchDeleteDialogOpen}
        onClose={() => !deleteBatchMutation.isPending && setIsBatchDeleteDialogOpen(false)}
        onConfirm={() => {
          deleteBatchMutation.mutate(selectedIds, {
            onSuccess: () => {
              toast("success", `Berhasil menghapus ${selectedIds.length} log audit terpilih`);
              setSelectedIds([]);
              setIsBatchDeleteDialogOpen(false);
            },
            onError: () => {
              toast("error", "Gagal menghapus log audit terpilih");
              setIsBatchDeleteDialogOpen(false);
            },
          });
        }}
        title={`Hapus ${selectedIds.length} Log Audit Terpilih`}
        description={`Apakah Anda yakin ingin menghapus ${selectedIds.length} log audit yang dipilih? Tindakan ini bersifat permanen dan tidak dapat dikembalikan.`}
        confirmText={`Hapus ${selectedIds.length} Log`}
        cancelText="Batal"
        variant="danger"
        isLoading={deleteBatchMutation.isPending}
      />

      {/* Delete All Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onClose={() => !deleteMutation.isPending && setIsDeleteDialogOpen(false)}
        onConfirm={() => {
          deleteMutation.mutate(schemaTab, {
            onSuccess: () => {
              toast("success", "Berhasil menghapus seluruh log audit");
              setSelectedIds([]);
              setIsDeleteDialogOpen(false);
            },
            onError: () => {
              toast("error", "Gagal menghapus log audit");
              setIsDeleteDialogOpen(false);
            },
          });
        }}
        title="Hapus Semua Log Audit"
        description={`Apakah Anda yakin ingin menghapus seluruh log audit dari sistem "${selectedAppName}"? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.`}
        confirmText="Hapus Semua"
        cancelText="Batal"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
