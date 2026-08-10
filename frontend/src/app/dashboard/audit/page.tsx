"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { AuditTable } from "@/components/audit/AuditTable";
import { AuditFilters } from "@/components/audit/AuditFilters";
import { useAuditLogs, useDeleteAuditLogs } from "@/hooks/use-audit";
import { useApps } from "@/hooks/use-apps";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Trash2 } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import type { AuditLog } from "@/types";

export default function AuditPage() {
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const [schemaTab, setSchemaTab] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const deleteMutation = useDeleteAuditLogs();

  const { data: apps } = useApps();

  useEffect(() => {
    if (apps && apps.length > 0 && !schemaTab) {
      setSchemaTab(apps[0].schemaName || apps[0].id);
    }
  }, [apps, schemaTab]);

  const { data, isLoading } = useAuditLogs({
    action: action || undefined,
    search: search || undefined,
    targetSchema: schemaTab || undefined,
    limit: 50,
  });

  const tabs = [
    ...(apps || []).map((app: any) => ({
      id: app.schemaName || app.id,
      label: app.name,
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Audit Log</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Catatan perubahan data yang dilakukan oleh administrator
          </p>
        </div>
        <Button
          variant="danger"
          icon={<Trash2 className="h-4 w-4" />}
          onClick={() => setIsDeleteDialogOpen(true)}
          loading={deleteMutation.isPending}
        >
          Hapus Semua Log
        </Button>
      </div>

      {/* Mobile Select */}
      <div className="block sm:hidden">
        <Select
          id="schemaTab"
          value={schemaTab}
          onChange={(e) => setSchemaTab(e.target.value)}
          options={tabs.map(tab => ({ value: tab.id, label: tab.label }))}
        />
      </div>

      {/* Desktop Buttons */}
      <div className="hidden sm:flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSchemaTab(tab.id)}
            className={`
              inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-all duration-200
              ${
                schemaTab === tab.id
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20 ring-1 ring-emerald-600"
                  : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-slate-200 shadow-sm dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 dark:border-slate-800"
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <AuditFilters
            action={action}
            search={search}
            onActionChange={setAction}
            onSearchChange={setSearch}
          />
        </CardHeader>
        <CardBody className="p-0">
          <AuditTable
            data={data?.data || []}
            loading={isLoading}
            onRowClick={(log) => setSelectedLog(log)}
          />
        </CardBody>
      </Card>

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

      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => !deleteMutation.isPending && setIsDeleteDialogOpen(false)}
        title="Hapus Semua Log Audit"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Apakah Anda yakin ingin menghapus <strong>seluruh log audit</strong> dari sistem{" "}
            <span className="font-semibold text-slate-900 dark:text-white">
              {schemaTab ? tabs.find((t) => t.id === schemaTab)?.label : "Semua Sistem"}
            </span>
            ? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              loading={deleteMutation.isPending}
              onClick={() => {
                deleteMutation.mutate(schemaTab, {
                  onSuccess: () => {
                    toast("success", "Berhasil menghapus log audit");
                    setIsDeleteDialogOpen(false);
                  },
                  onError: () => {
                    toast("error", "Gagal menghapus log audit");
                    setIsDeleteDialogOpen(false);
                  },
                });
              }}
            >
              Ya, Hapus
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
