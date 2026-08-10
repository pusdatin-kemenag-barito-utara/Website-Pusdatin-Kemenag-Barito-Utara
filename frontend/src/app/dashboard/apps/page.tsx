"use client";

import { useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { AppGrid } from "@/components/apps/AppGrid";
import { AppForm } from "@/components/apps/AppForm";
import { useApps, useToggleMaintenance, useBulkToggleMaintenance, useCreateApp } from "@/hooks/use-apps";
import { toast } from "@/components/ui/Toast";
import type { SateliteApp } from "@/types";
import { AlertTriangle, Settings2, CheckCircle2, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { Dialog } from "@/components/ui/Dialog";

export default function AppsPage() {
  const { data: apps, isLoading } = useApps();
  const toggleMutation = useToggleMaintenance();
  const bulkToggleMutation = useBulkToggleMaintenance();
  const createAppMutation = useCreateApp();
  const [confirmBulkStatus, setConfirmBulkStatus] = useState<"online" | "maintenance" | null>(null);
  const [showAddApp, setShowAddApp] = useState(false);

  const handleToggle = async (appId: string, status: SateliteApp["status"]) => {
    try {
      await toggleMutation.mutateAsync({ appId, status });
      toast("success", `Status aplikasi berhasil diubah`);
    } catch {
      toast("error", "Gagal mengubah status aplikasi");
    }
  };

  const handleBulkToggle = async () => {
    if (!confirmBulkStatus) return;
    try {
      await bulkToggleMutation.mutateAsync({ status: confirmBulkStatus });
      toast("success", `Semua aplikasi berhasil diubah ke mode ${confirmBulkStatus}`);
    } catch {
      toast("error", "Gagal mengubah status massal");
    } finally {
      setConfirmBulkStatus(null);
    }
  };

  const handleCreateApp = async (data: Partial<SateliteApp>) => {
    try {
      await createAppMutation.mutateAsync(data);
      toast("success", "Aplikasi satelit berhasil ditambahkan");
      setShowAddApp(false);
    } catch {
      toast("error", "Gagal menambahkan aplikasi");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Pusat Kendali Aplikasi</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola status operasional dan pantau kesehatan sistem
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowAddApp(true)}>
            Tambah Aplikasi
          </Button>
          <Dropdown
            trigger={
              <Button className="gap-2" variant="outline">
                <Settings2 className="h-4 w-4" />
                Kontrol Global
              </Button>
            }
            items={[
              {
                label: "Set Semua Online",
                icon: <CheckCircle2 className="h-4 w-4" />,
                onClick: () => setConfirmBulkStatus("online"),
              },
              {
                label: "Set Semua Maintenance",
                icon: <AlertTriangle className="h-4 w-4" />,
                danger: true,
                onClick: () => setConfirmBulkStatus("maintenance"),
              },
            ]}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-900 dark:text-white">Status Aplikasi Satelit</h3>
        </CardHeader>
        <CardBody>
          <AppGrid
            apps={apps || []}
            loading={isLoading}
            onToggle={handleToggle}
          />
        </CardBody>
      </Card>

      <Dialog
        open={!!confirmBulkStatus}
        onClose={() => setConfirmBulkStatus(null)}
        title="Konfirmasi Kontrol Global"
      >
        <div className="space-y-6">
          <p className="text-slate-600">
            Apakah Anda yakin ingin mengubah status <strong>SELURUH APLIKASI</strong> menjadi mode{" "}
            <strong className={confirmBulkStatus === "online" ? "text-emerald-600" : "text-amber-600"}>
              {confirmBulkStatus === "online" ? "Online" : "Maintenance"}
            </strong>?
          </p>
          <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
            Tindakan ini akan mempengaruhi semua aplikasi sekaligus dan tidak dapat dibatalkan selain dengan mengubahnya kembali.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmBulkStatus(null)}>
              Batal
            </Button>
            <Button
              className={confirmBulkStatus === "online" ? "" : "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500"}
              onClick={handleBulkToggle}
              disabled={bulkToggleMutation.isPending}
            >
              {bulkToggleMutation.isPending ? "Menyimpan..." : "Ya, Eksekusi Global"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={showAddApp}
        onClose={() => setShowAddApp(false)}
        title="Tambah Aplikasi Satelit Baru"
      >
        <AppForm
          onSubmit={handleCreateApp}
          onCancel={() => setShowAddApp(false)}
          loading={createAppMutation.isPending}
        />
      </Dialog>
    </div>
  );
}
