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
import { trackAppClick, trackAdminOperation } from "@/lib/analytics";

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

const formatHostname = (urlStr: string | null | undefined) => {
  if (!urlStr) return "Belum diatur";
  try {
    const formatted = urlStr.startsWith("http://") || urlStr.startsWith("https://") ? urlStr : `https://${urlStr}`;
    return new URL(formatted).hostname;
  } catch {
    return urlStr;
  }
};

const formatDatabaseUrl = (urlStr: string | null | undefined) => {
  if (!urlStr) return "";
  let formatted = urlStr.trim();
  if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
    formatted = `https://${formatted}`;
  }
  formatted = formatted.replace(/\/+$/, "");
  if (!formatted.endsWith("/_")) {
    formatted = `${formatted}/_/`;
  } else {
    formatted = `${formatted}/`;
  }
  return formatted;
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
      trackAdminOperation("delete_app", deletingApp.name, { app_id: deletingApp.id });
      toast("success", `Aplikasi ${deletingApp.name} berhasil dihapus`);
      setDeletingApp(null);
    } catch {
      toast("error", "Gagal menghapus aplikasi");
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 xl:grid-cols-3">
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
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {apps.map((app) => {
          const localhostPorts = Array.from({ length: 5 }, (_, i) => 3001 + i);
          const dropdownItems = localhostPorts.map((port) => ({
            label: `Localhost:${port}`,
            icon: <Server className="h-3 w-3" />,
            onClick: () => {
              window.open(`http://localhost:${port}`, "_blank");
            },
          }));

          const dbLink = formatDatabaseUrl(app.schemaUrl);

          return (
            <Card
              key={app.id}
              className="group relative z-0 hover:z-10 focus-within:z-10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/5 border-slate-200/60"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-xl pointer-events-none" />

              <CardBody className="relative flex h-full flex-col p-4 sm:p-5">
                {/* Header: App Logo, Name, Desc & Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-1 items-center gap-3.5 min-w-0">
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
                    <div className="min-w-0 flex-1">
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

                {/* Metadata Pills: Database URL & Website Link */}
                <div className="my-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {/* Database URL PocketBase */}
                  {dbLink ? (
                    <a
                      href={dbLink}
                      target="_blank"
                      rel="noreferrer"
                      className="group/db flex items-center justify-between gap-2 rounded-lg bg-indigo-50/70 hover:bg-indigo-100/80 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/40 px-3 py-2 border border-indigo-100/70 dark:border-indigo-900/50 min-w-0 transition-all shadow-sm"
                      title={`Buka Database PocketBase: ${dbLink}`}
                      aria-label={`Buka Database PocketBase ${app.name}`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <Database className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                          Database:
                        </span>
                        <span
                          className="truncate font-semibold text-indigo-700 dark:text-indigo-300 group-hover/db:underline"
                          title={dbLink}
                        >
                          {formatHostname(app.schemaUrl)}
                        </span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-indigo-600 dark:text-indigo-400 transition-transform group-hover/db:translate-x-0.5 group-hover/db:-translate-y-0.5" />
                    </a>
                  ) : (
                    <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2 border border-slate-100 dark:border-slate-800/80 min-w-0 text-slate-400 dark:text-slate-500">
                      <Database className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-[11px] font-medium">Database: Belum diatur</span>
                    </div>
                  )}

                  {/* URL Website */}
                  {app.url ? (
                    <a
                      href={app.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() =>
                        trackAppClick({
                          id: app.id,
                          name: app.name,
                          url: app.url,
                          schemaName: app.schemaName,
                        })
                      }
                      className="group/web flex items-center justify-between gap-2 rounded-lg bg-emerald-50/70 hover:bg-emerald-100/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/40 px-3 py-2 border border-emerald-100/70 dark:border-emerald-900/50 min-w-0 transition-all shadow-sm"
                      title={`Kunjungi Website: ${app.url}`}
                      aria-label={`Kunjungi Website ${app.name}`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <Globe className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 shrink-0">
                          Website:
                        </span>
                        <span
                          className="truncate font-semibold text-emerald-700 dark:text-emerald-300 group-hover/web:underline"
                          title={app.url}
                        >
                          {formatHostname(app.url)}
                        </span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400 transition-transform group-hover/web:translate-x-0.5 group-hover/web:-translate-y-0.5" />
                    </a>
                  ) : (
                    <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 px-3 py-2 border border-slate-100 dark:border-slate-800/80 min-w-0 text-slate-400 dark:text-slate-500">
                      <Globe className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-[11px] font-medium">Website: Belum diatur</span>
                    </div>
                  )}
                </div>

                {/* Bottom Action Row: Status Switcher & Localhost Dropdown side-by-side */}
                <div className="mt-auto flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 gap-2">
                  {/* Status Switcher */}
                  <div className="relative flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg flex-1 max-w-[210px] sm:max-w-[220px]">
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
                        "relative z-10 flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold transition-colors rounded-md", 
                        app.status === 'online' ? "text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                      )}
                    >
                      <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", app.status === 'online' ? "bg-white animate-pulse" : "bg-transparent")} />
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
                        "relative z-10 flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold transition-colors rounded-md", 
                        app.status !== 'online' ? "text-white" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                      )}
                    >
                      <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", app.status !== 'online' ? "bg-white" : "bg-transparent")} />
                      Maintenance
                    </button>
                  </div>

                  {/* Localhost Dropdown Button */}
                  <div className="shrink-0">
                    <Dropdown
                      trigger={
                        <button 
                          type="button"
                          aria-label={`Buka ${app.name} di Localhost`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:text-emerald-800 dark:hover:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/50 shadow-sm"
                        >
                          <Server className="h-3.5 w-3.5 shrink-0" />
                          <span className="whitespace-nowrap">Localhost</span>
                          <span className="text-[10px] opacity-70">▾</span>
                        </button>
                      }
                      items={dropdownItems}
                      position="top"
                      align="right"
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

    if (file.size > 2 * 1024 * 1024) {
      toast("error", "Ukuran file maksimal 2MB");
      return;
    }

    try {
      setIsUploading(true);
      const data = new FormData();
      data.append("file", file);

      const token = typeof window !== "undefined" ? localStorage.getItem("pusdatin_token") : null;
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        headers,
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

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      let formattedSchemaUrl = formData.schemaUrl.trim();
      if (formattedSchemaUrl) {
        if (!formattedSchemaUrl.startsWith("http://") && !formattedSchemaUrl.startsWith("https://")) {
          formattedSchemaUrl = `https://${formattedSchemaUrl}`;
        }
        formattedSchemaUrl = formattedSchemaUrl.replace(/\/+$/, "");
        if (!formattedSchemaUrl.endsWith("/_")) {
          formattedSchemaUrl = `${formattedSchemaUrl}/_/`;
        } else {
          formattedSchemaUrl = `${formattedSchemaUrl}/`;
        }
      }

      await updateMutation.mutateAsync({
        appId: app.id,
        data: {
          name: formData.name,
          description: formData.description,
          url: formData.url,
          schemaName: formData.schemaName,
          schemaUrl: formattedSchemaUrl,
          sortOrder: parseInt(formData.sortOrder, 10) || 0,
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
    <Dialog open={true} onClose={onClose} title="Edit Aplikasi Satelit" size="lg">
      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="space-y-3.5 pb-3">
          {/* Row 1: Nama & Sort Order */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                id="edit-name"
                label="Nama Aplikasi"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <Input
                id="edit-sortOrder"
                label="Urutan Tampil (Sort)"
                type="number"
                value={formData.sortOrder}
                onChange={(e) =>
                  setFormData({ ...formData, sortOrder: e.target.value })
                }
                required
              />
            </div>
          </div>

          {/* Row 2: Deskripsi Singkat */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Deskripsi Singkat
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              rows={2}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          {/* Row 3: Compact Logo Upload */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-3">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden relative group">
                {formData.icon ? (
                  <img
                    src={formData.icon}
                    alt="Preview Logo"
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-contain"
                    style={{ transform: `scale(${formData.iconScale / 100})` }}
                  />
                ) : (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">No Logo</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-8 px-2.5"
                    onClick={() => fileInputRef.current?.click()}
                    loading={isUploading}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {formData.icon ? "Ganti Logo" : "Upload Logo"}
                  </Button>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    PNG/JPG/SVG, maks 2MB
                  </span>
                </div>

                {formData.icon && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-slate-500 font-medium shrink-0">Ukuran:</span>
                    <input
                      type="range"
                      min="10"
                      max="150"
                      value={formData.iconScale}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          iconScale: parseInt(e.target.value, 10),
                        })
                      }
                      className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 w-8 text-right">
                      {formData.iconScale}%
                    </span>
                  </div>
                )}
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/png, image/jpeg, image/svg+xml"
              onChange={handleFileUpload}
            />
          </div>

          {/* Row 4: URL Website (Online) */}
          <div>
            <Input
              id="edit-url"
              label="URL Website Aplikasi (Online)"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              type="url"
              placeholder="https://baritoutara.kemenag.go.id"
            />
          </div>

          {/* Row 5: Database Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Input
                id="edit-schemaUrl"
                label="URL Database PocketBase"
                value={formData.schemaUrl}
                onChange={(e) =>
                  setFormData({ ...formData, schemaUrl: e.target.value })
                }
                type="url"
                placeholder="https://db-website.kemenag-baritoutara.com/_/"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Otomatis ditambahkan akhiran <code className="text-emerald-600 dark:text-emerald-400 font-semibold">/_/</code> untuk membuka PocketBase Admin
              </p>
            </div>
            <div>
              <Input
                id="edit-schemaName"
                label="Nama Schema / DB (Opsional)"
                value={formData.schemaName}
                onChange={(e) =>
                  setFormData({ ...formData, schemaName: e.target.value })
                }
                placeholder="kemenag_website"
              />
            </div>
          </div>
        </div>

        {/* Sticky Bottom Action Buttons */}
        <div className="sticky bottom-0 -mx-4 -mb-4 sm:-mx-6 sm:-mb-4 mt-3 border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-end gap-2.5 z-20">
          <Button variant="outline" type="button" onClick={onClose} className="flex-1 sm:flex-none">
            Batal
          </Button>
          <Button
            type="submit"
            loading={updateMutation.isPending || isUploading}
            className="flex-1 sm:flex-none"
          >
            Simpan Perubahan
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
