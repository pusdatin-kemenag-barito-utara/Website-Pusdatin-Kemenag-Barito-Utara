import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { Upload } from "lucide-react";
import type { SateliteApp } from "@/types";

interface AppFormProps {
  onSubmit: (data: Partial<SateliteApp>) => void;
  onCancel: () => void;
  loading?: boolean;
}

const statusOptions: { value: SateliteApp["status"]; label: string }[] = [
  { value: "online", label: "Online" },
  { value: "maintenance", label: "Maintenance" },
  { value: "degraded", label: "Gangguan" },
];

export function AppForm({ onSubmit, onCancel, loading }: AppFormProps) {
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    description: "",
    schemaName: "",
    url: "",
    schemaUrl: "",
    status: "online" as SateliteApp["status"],
    sortOrder: "0",
    icon: "",
    iconScale: 50,
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

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const finalIcon = formData.icon ? `${formData.icon.split("?")[0]}?scale=${formData.iconScale}` : "";
    
    // Auto-generate ID from name
    const generatedId = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "");

    // Ensure PocketBase URL ends with /_/
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

    onSubmit({
      id: generatedId,
      name: formData.name,
      description: formData.description,
      schemaName: formData.schemaName || generatedId,
      url: formData.url,
      schemaUrl: formattedSchemaUrl,
      status: formData.status,
      sortOrder: parseInt(formData.sortOrder, 10) || 0,
      icon: finalIcon,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col">
      <div className="space-y-3.5 pb-3">
        {/* Row 1: Nama & Sort Order */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              id="name"
              label="Nama Aplikasi"
              placeholder="Contoh: PTSP Si ATAK"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <Input
              id="sortOrder"
              label="Urutan Tampil (Sort)"
              type="number"
              value={formData.sortOrder}
              onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
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
            placeholder="Deskripsi singkat fungsi aplikasi..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, iconScale: parseInt(e.target.value, 10) })}
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

        {/* Row 4: URL Website & Status Awal */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              id="url"
              label="URL Website Aplikasi (Online)"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              type="url"
              placeholder="https://baritoutara.kemenag.go.id"
            />
          </div>
          <div>
            <Select
              id="status"
              label="Status Awal"
              options={statusOptions}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as SateliteApp["status"] })}
            />
          </div>
        </div>

        {/* Row 5: Database Settings */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Input
              id="schemaUrl"
              label="URL Database PocketBase"
              value={formData.schemaUrl}
              onChange={(e) => setFormData({ ...formData, schemaUrl: e.target.value })}
              type="url"
              placeholder="https://db-website.kemenag-baritoutara.com/_/"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Otomatis ditambahkan akhiran <code className="text-emerald-600 dark:text-emerald-400 font-semibold">/_/</code> untuk membuka PocketBase Admin
            </p>
          </div>
          <div>
            <Input
              id="schemaName"
              label="Nama Schema / DB (Opsional)"
              value={formData.schemaName}
              onChange={(e) => setFormData({ ...formData, schemaName: e.target.value })}
              placeholder="kemenag_website"
            />
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Buttons */}
      <div className="sticky bottom-0 -mx-4 -mb-4 sm:-mx-6 sm:-mb-4 mt-3 border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-end gap-2.5 z-20">
        <Button variant="outline" type="button" onClick={onCancel} className="flex-1 sm:flex-none">
          Batal
        </Button>
        <Button type="submit" loading={loading || isUploading} className="flex-1 sm:flex-none">
          Simpan Aplikasi
        </Button>
      </div>
    </form>
  );
}
