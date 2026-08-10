"use client";

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

const statusOptions = [
  { value: "online", label: "Online" },
  { value: "maintenance", label: "Maintenance" },
  { value: "offline", label: "Offline" },
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalIcon = formData.icon ? `${formData.icon.split('?')[0]}?scale=${formData.iconScale}` : "";
    
    // Auto-generate ID from name
    const generatedId = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_|_$)/g, "");

    onSubmit({
      id: generatedId,
      name: formData.name,
      description: formData.description,
      schemaName: formData.schemaName,
      url: formData.url,
      schemaUrl: formData.schemaUrl,
      status: formData.status,
      sortOrder: parseInt(formData.sortOrder, 10),
      icon: finalIcon,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-start">
        <div className="flex-1 space-y-4 w-full">
          <div>
            <Input
              id="name"
              label="Nama Aplikasi"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Deskripsi Singkat
            </label>
            <textarea
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>

        <div className="flex flex-row sm:flex-col items-center justify-center gap-4 pt-2 sm:pt-6 w-full sm:w-auto">
          <div className="h-20 w-20 shrink-0 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden relative group">
            {formData.icon ? (
              <img
                src={formData.icon}
                alt="Logo"
                className="h-full w-full object-contain"
                style={{ transform: `scale(${formData.iconScale / 100})` }}
              />
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">No Logo</span>
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
          <div className="flex flex-col items-start sm:items-center">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[100px] text-left sm:text-center">
              JPG/PNG/SVG<br />Max 2MB
            </span>
            {formData.icon && (
              <div className="w-full mt-1">
                <input
                  type="range"
                  min="10"
                  max="150"
                  value={formData.iconScale}
                  onChange={(e) => setFormData({ ...formData, iconScale: parseInt(e.target.value, 10) })}
                  className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-left sm:text-center text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Ukuran: {formData.iconScale}%
                </div>
              </div>
            )}
          </div>
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
        <Input
          id="url"
          label="URL Default (Online)"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          type="url"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Input
            id="schemaName"
            label="Schema DB"
            value={formData.schemaName}
            onChange={(e) => setFormData({ ...formData, schemaName: e.target.value })}
            required
          />
        </div>
        <div>
          <Input
            id="schemaUrl"
            label="URL Schema DB (Opsional)"
            value={formData.schemaUrl}
            onChange={(e) => setFormData({ ...formData, schemaUrl: e.target.value })}
            type="url"
            placeholder="https://supabase.com/..."
          />
        </div>
        <div>
          <Input
            id="sortOrder"
            label="Sort Order"
            type="number"
            value={formData.sortOrder}
            onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
            required
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

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" type="button" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" loading={loading || isUploading}>
          Simpan Aplikasi
        </Button>
      </div>
    </form>
  );
}
