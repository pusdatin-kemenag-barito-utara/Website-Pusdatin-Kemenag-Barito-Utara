
import { useState, useRef } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import type { SateliteApp } from "@/types";
import { cn } from "@/lib/utils";
import {
  ExternalLink,
  Server,
  Database,
  Globe,
  Upload,
  Edit,
  Trash2,
} from "lucide-react";
import { useUpdateApp, useDeleteApp } from "@/hooks/use-apps";
import { toast } from "@/components/ui/Toast";

const parseIconUrl = (iconStr: string | null) => {
  if (!iconStr) return { url: "", scale: 50 };
  const [url, query] = iconStr.split("?");
  let scale = 50;
  if (query) {
    const params = new URLSearchParams(query);
    if (params.has("scale")) {
      scale = parseInt(params.get("scale")!, 10);
    }
  }
  return { url, scale };
};

const buildIconUrl = (url: string, scale: number) => {
  if (!url) return "";
  const base = url.split("?")[0];
  return `${base}?scale=${scale}`;
};

const appIcons: Record<string, string> = {
  ptsp: "PTSP",
  e_arsip: "E-Arsip",
  e_surat: "E-Surat",
  website: "Web",
  inklusi: "Inklusi",
  bot: "Bot",
  loket: "Loket",
};

export function AppGrid({
  apps,
  loading,
  onToggle,
}: {
  apps: SateliteApp[];
  loading?: boolean;
  onToggle: (id: string, status: "online" | "maintenance") => void;
}) {
  const [editingApp, setEditingApp] = useState<SateliteApp | null>(null);
  const [deletingApp, setDeletingApp] = useState<SateliteApp | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<{ id: string; status: "online" | "maintenance"; appName: string } | null>(null);
  const deleteMutation = useDeleteApp();

  const handleDeleteApp = async () => {
    if (!deletingApp) return;
    try {
      await deleteMutation.mutateAsync(deletingApp.id);
      toast("success", `Aplikasi ${deletingApp.name} berhasil dihapus`);
      setDeletingApp(null);
    } catch {
      toast("error", "Gagal menghapus aplikasi");
    }
  };

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardBody>
              <Skeleton className="h-6 w-20" />
              <Skeleton className="mt-2 h-4 w-32" />
              <Skeleton className="mt-4 h-5 w-12" />
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  if (!apps?.length) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-500">
        Tidak ada aplikasi
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {apps.map((app, index) => {
          const localhostPorts = Array.from({ length: 5 }, (_, i) => 3001 + i);
          const dropdownItems = localhostPorts.map((port) => ({
            label: `Localhost:${port}`,
            icon: <Server className="h-3 w-3" />,
            onClick: () => {
              window.open(`http://localhost:${port}`, "_blank");
            },
          }));

          return (
            <Card
              key={app.id}
              className="group relative z-0 hover:z-10 focus-within:z-10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/5 border-slate-200/60"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-xl" />

              <CardBody className="relative flex h-full flex-col p-4 sm:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-1 items-center gap-4 min-w-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold text-lg ring-1 ring-emerald-100 dark:ring-emerald-900/50 shrink-0">
                      {parseIconUrl(app.icon).url ? (
                        <img
                          src={parseIconUrl(app.icon).url}
                          alt={app.name || "Logo Aplikasi"}
                          width={48}
                          height={48}
                          decoding="async"
                          className="h-full w-full object-contain"
                          style={{ transform: `scale(${parseIconUrl(app.icon).scale / 100})` }}
                        />
                      ) : (
                        appIcons[app.id] || app.name[0]
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-white transition-colors group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                        {app.name}
                      </h3>
                      <p className="line-clamp-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {app.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setEditingApp(app)}
                      className="rounded-full bg-emerald-50 p-2 text-emerald-600 ring-1 ring-emerald-100 transition-all hover:bg-emerald-100 hover:text-emerald-700 hover:ring-emerald-200"
                      title="Edit Aplikasi"
                      aria-label={`Edit ${app.name}`}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeletingApp(app)}
                      className="rounded-full bg-rose-50 p-2 text-rose-600 ring-1 ring-rose-100 transition-all hover:bg-rose-100 hover:text-rose-700 hover:ring-rose-200"
                      title="Hapus Aplikasi"
                      aria-label={`Hapus ${app.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 mb-5 grid grid-cols-2 gap-2 sm:gap-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-2 sm:p-3 text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="flex flex-col gap-1.5 overflow-hidden">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400">
                      <Database className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Schema DB</span>
                    </div>
                    <div className="flex items-center gap-1.5 w-full min-w-0">
                      <span
                        className="flex-1 min-w-0 truncate font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950 px-2 py-1 rounded-md border border-slate-100 dark:border-slate-800"
                        title={app.schemaName || app.schema}
                      >
                        {app.schemaName || app.schema}
                      </span>
                      {app.schemaUrl && (
                        <a
                          href={app.schemaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-emerald-600 hover:text-emerald-800 transition-colors"
                          title="Buka Schema URL"
                          aria-label={`Buka Schema URL ${app.name}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 overflow-hidden">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400">
                      <Globe className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">URL Website</span>
                    </div>
                    <div className="flex items-center gap-1.5 w-full min-w-0">
                      <span
                        className="flex-1 min-w-0 truncate font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-md border border-emerald-100/50 dark:border-emerald-900/50"
                        title={app.url || ""}
                      >
                        {app.url ? new URL(app.url).hostname : "Belum diatur"}
                      </span>
                      {app.url && (
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-emerald-600 hover:text-emerald-800 transition-colors"
                          title="Buka Link"
                          aria-label={`Buka Website ${app.name}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex flex-wrap items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 gap-3">
                  <div className="relative flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg w-full sm:w-[240px]">
                    <div 
                      className={cn(
                        "absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md shadow-sm transition-all duration-300 ease-out", 
                        app.status === 'online' 
                          ? "left-1 bg-emerald-500 dark:bg-emerald-600 shadow-emerald-500/20" 
                          : "left-[calc(50%+2px)] bg-red-500 dark:bg-red-600 shadow-red-500/20"
                      )} 
                    />
                    <button 
                      type="button"
                      aria-label={`Ubah status ${app.name} ke Online`}
                      onClick={() => {
                        if (app.status !== 'online') {
                          setConfirmToggle({ id: app.id, status: 'online', appName: app.name });
                        }
                      }}
                      className={cn(
                        "relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] uppercase tracking-wider font-bold transition-colors rounded-md", 
                        app.status === 'online' ? "text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                      )}
                    >
                      <div className={cn("h-1.5 w-1.5 rounded-full", app.status === 'online' ? "bg-white animate-pulse" : "bg-transparent")} />
                      Online
                    </button>
                    <button 
                      type="button"
                      aria-label={`Ubah status ${app.name} ke Maintenance`}
                      onClick={() => {
                        if (app.status !== 'maintenance') {
                          setConfirmToggle({ id: app.id, status: 'maintenance', appName: app.name });
                        }
                      }}
                      className={cn(
                        "relative z-10 flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] uppercase tracking-wider font-bold transition-colors rounded-md", 
                        app.status !== 'online' ? "text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                      )}
                    >
                      <div className={cn("h-1.5 w-1.5 rounded-full", app.status !== 'online' ? "bg-white" : "bg-transparent")} />
                      Maintenance
                    </button>
                  </div>

                    <div className="w-full sm:w-auto mt-2 sm:mt-0">
                      <Dropdown
                        trigger={
                          <button 
                            type="button"
                            aria-label={`Buka ${app.name} di Local`}
                            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:text-emerald-800 dark:hover:text-emerald-300"
                          >
                            Buka di local
                            <Server className="h-3.5 w-3.5" />
                          </button>
                        }
                        items={dropdownItems}
                        position={index >= apps.length - 3 ? "top" : "bottom"}
                      />
                    </div>
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      {editingApp && (
        <EditAppModal app={editingApp} onClose={() => setEditingApp(null)} />
      )}

      <Dialog
        open={!!confirmToggle}
        onClose={() => setConfirmToggle(null)}
        title="Konfirmasi Perubahan Status"
      >
        <div className="space-y-6">
          <p className="text-slate-600">
            Apakah Anda yakin ingin mengubah status aplikasi <strong>{confirmToggle?.appName}</strong> menjadi mode{" "}
            <strong className={confirmToggle?.status === "online" ? "text-emerald-600" : "text-amber-600"}>
              {confirmToggle?.status === "online" ? "Online" : "Maintenance"}
            </strong>?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmToggle(null)}>
              Batal
            </Button>
            <Button
              className={confirmToggle?.status === "online" ? "" : "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500"}
              onClick={() => {
                if (confirmToggle) {
                  onToggle(confirmToggle.id, confirmToggle.status);
                  setConfirmToggle(null);
                }
              }}
            >
              Ya, Ubah Status
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={!!deletingApp}
        onClose={() => setDeletingApp(null)}
        title="Hapus Aplikasi Satelit"
      >
        <div className="space-y-6">
          <p className="text-slate-600 dark:text-slate-300">
            Apakah Anda yakin ingin menghapus aplikasi <strong>{deletingApp?.name}</strong> dari sistem Pusdatin?
          </p>
          <p className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-lg border border-rose-100 dark:border-rose-900/50">
            ⚠️ Tindakan ini akan menghapus entri aplikasi satelit dari dashboard Pusdatin dan tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeletingApp(null)}>
              Batal
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white focus:ring-rose-500"
              onClick={handleDeleteApp}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Ya, Hapus Aplikasi"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function EditAppModal({
  app,
  onClose,
}: {
  app: SateliteApp;
  onClose: () => void;
}) {
  const updateMutation = useUpdateApp();
  const iconData = parseIconUrl(app.icon);
  const [formData, setFormData] = useState({
    name: app.name,
    description: app.description || "",
    url: app.url || "",
    schemaName: app.schemaName || app.schema || "",
    schemaUrl: app.schemaUrl || "",
    sortOrder: app.sortOrder?.toString() || "0",
    icon: iconData.url,
    iconScale: iconData.scale,
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size and type if needed
    if (file.size > 2 * 1024 * 1024) {
      toast("error", "Ukuran file maksimal 2MB");
      return;
    }

    try {
      setIsUploading(true);
      const data = new FormData();
      data.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: data,
      });

      if (!res.ok) throw new Error("Gagal upload");

      const result = await res.json();
      setFormData((prev) => ({ ...prev, icon: result.url, iconScale: 50 }));
      toast("success", "Logo berhasil diunggah");
    } catch (err) {
      console.error(err);
      toast("error", "Gagal mengunggah logo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        appId: app.id,
        data: {
          name: formData.name,
          description: formData.description,
          url: formData.url,
          schemaName: formData.schemaName,
          schemaUrl: formData.schemaUrl,
          sortOrder: parseInt(formData.sortOrder, 10),
          icon: buildIconUrl(formData.icon, formData.iconScale),
        } as Partial<SateliteApp>,
      });
      toast("success", "Aplikasi berhasil diperbarui");
      onClose();
    } catch {
      toast("error", "Gagal memperbarui aplikasi");
    }
  };

  return (
    <Dialog open={true} onClose={onClose} title="Edit Aplikasi Satelit">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4 items-start">
          <div className="flex-1 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Nama Aplikasi
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Deskripsi Singkat
              </label>
              <textarea
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                rows={2}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 pt-6">
            <div className="h-20 w-20 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden relative group">
              {formData.icon ? (
                <img
                  src={formData.icon}
                  alt="Preview Logo Aplikasi"
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain"
                  style={{ transform: `scale(${formData.iconScale / 100})` }}
                />
              ) : (
                <span className="text-xs text-slate-400 font-medium">
                  No Logo
                </span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-white hover:text-white hover:bg-white/20"
                  onClick={() => fileInputRef.current?.click()}
                  loading={isUploading}
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[100px] text-center">
              JPG/PNG/SVG
              <br />
              Max 2MB
            </span>
            {formData.icon && (
              <div className="w-full mt-1">
                <input
                  type="range"
                  min="10"
                  max="150"
                  value={formData.iconScale}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      iconScale: parseInt(e.target.value),
                    })
                  }
                  className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-center text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Ukuran: {formData.iconScale}%
                </div>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/png, image/jpeg, image/svg+xml"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
            URL Default (Online)
          </label>
          <Input
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            type="url"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Schema DB
            </label>
            <Input
              value={formData.schemaName}
              onChange={(e) =>
                setFormData({ ...formData, schemaName: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              URL Schema DB (Opsional)
            </label>
            <Input
              value={formData.schemaUrl}
              onChange={(e) =>
                setFormData({ ...formData, schemaUrl: e.target.value })
              }
              type="url"
              placeholder="https://supabase.com/..."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Sort Order
            </label>
            <Input
              type="number"
              value={formData.sortOrder}
              onChange={(e) =>
                setFormData({ ...formData, sortOrder: e.target.value })
              }
              required
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" type="button" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            loading={updateMutation.isPending || isUploading}
          >
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
