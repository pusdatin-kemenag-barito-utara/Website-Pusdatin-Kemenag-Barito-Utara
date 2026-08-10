"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import type { User, AppPermission } from "@/types";
import { useApps } from "@/hooks/use-apps";

const roleOptions = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "sub_admin", label: "Sub Admin" },
];

const userTypeOptions = [
  { value: "internal_admin", label: "Admin Internal" },
  { value: "internal_pegawai", label: "Pegawai Kemenag" },
  { value: "eksternal_masyarakat", label: "Masyarakat Umum" },
];

const UNIT_KERJA_OPTIONS = [
  "Kantor Kementerian Agama",
  "Sub Bagian Tata Usaha",
  "Seksi Bimbingan Masyarakat Islam",
  "Seksi Pendidikan Agama Islam",
  "Seksi Pendidikan Madrasah",
  "Seksi Pendidikan Diniyah & Pondok Pesantren",
  "Penyelenggara Zakat dan Wakaf",
  "Penyelenggara Hindu",
  "KUA Kecamatan Teweh Tengah",
  "KUA Kecamatan Teweh Timur",
  "KUA Kecamatan Gunung Timang",
  "KUA Kecamatan Lahei",
  "KUA Kecamatan Montallat",
  "MAN Barito Utara",
  "MTsN Barito Utara",
  "MIN 1 Barito Utara",
  "MIN 2 Barito Utara",
  "MI Swasta",
  "MTs Swasta",
  "RA/BA",
  "SD Negeri",
  "SLTP Negeri",
  "SLTA/SMK Negeri",
];



interface UserFormProps {
  initialData?: User;
  defaultUserType?: string;
  onSubmit: (data: Partial<User>) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function UserForm({ initialData, defaultUserType, onSubmit, onCancel, loading }: UserFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(initialData?.role || "admin");
  const [userType, setUserType] = useState<User["userType"]>(initialData?.userType || (defaultUserType as User["userType"]) || "internal_admin");
  const [status, setStatus] = useState<"active" | "inactive">(
    initialData?.status || "active",
  );
  const fallbackNip = (initialData?.email && initialData.email.includes("@")) ? initialData.email.split("@")[0] : "";
  const [nip, setNip] = useState(initialData?.nip || fallbackNip);
  const [jabatan, setJabatan] = useState(initialData?.jabatan || "");
  const [unitKerja, setUnitKerja] = useState(initialData?.unitKerja || "");
  const [unitKerjaCustom, setUnitKerjaCustom] = useState(
    initialData?.unitKerja && !UNIT_KERJA_OPTIONS.includes(initialData.unitKerja)
      ? initialData.unitKerja
      : ""
  );
  const isCustomUnitKerja = unitKerja === "__lainnya__";

  // Masyarakat fields
  const [nik, setNik] = useState(initialData?.nik || "");
  const [noHp, setNoHp] = useState(initialData?.noHp || "");
  const [alamat, setAlamat] = useState(initialData?.alamat || "");
  const [pekerjaan, setPekerjaan] = useState(initialData?.pekerjaan || "");
  
  const { data: apps } = useApps();
  const [appPermissions, setAppPermissions] = useState<AppPermission[]>(
    initialData?.appPermissions || []
  );

  useEffect(() => {
    if (apps && apps.length > 0) {
      setAppPermissions((prev) => {
        const newPerms = apps.map((app) => {
          const existing = prev.find((p) => p.appId === app.id);
          return existing || { appId: app.id, appName: app.name, role: "none" as const, features: [] };
        });
        return newPerms;
      });
    }
  }, [apps]);

  const handleAppRoleChange = (appId: string, appRole: AppPermission["role"]) => {
    setAppPermissions((prev) =>
      prev.map((p) => (p.appId === appId ? { ...p, role: appRole, features: appRole === "none" ? [] : p.features } : p)),
    );
  };

  const handleFeatureToggle = (appId: string, featureId: string, checked: boolean) => {
    setAppPermissions((prev) =>
      prev.map((p) => {
        if (p.appId === appId) {
          const newFeatures = checked 
            ? [...(p.features || []), featureId]
            : (p.features || []).filter(f => f !== featureId);
          return { ...p, features: newFeatures };
        }
        return p;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-assign global role based on userType so it's strictly scoped
    let finalRole = role;
    if (userType === "internal_pegawai") {
      finalRole = "pegawai";
    } else if (userType === "eksternal_masyarakat") {
      finalRole = "user";
    }

    onSubmit({
      name,
      email,
      ...(password ? { password } : {}),
      role: finalRole,
      userType,
      status,
      ...(userType === "internal_pegawai" ? { nip, jabatan, unitKerja: isCustomUnitKerja ? unitKerjaCustom : unitKerja } : {}),
      ...(userType === "eksternal_masyarakat" ? { nik, noHp, alamat, pekerjaan } : {}),
      appPermissions: userType === "internal_admin" && finalRole !== "super_admin" ? appPermissions.filter((p) => p.role !== "none") : [],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="name"
          label="Nama Lengkap"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          id="email"
          label="Email / Akun"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          id="password"
          label={initialData ? "Password (kosongkan jika tidak diubah)" : "Password"}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required={!initialData}
          autoComplete="new-password"
        />
        <Select
          id="userType"
          label="Tipe Pengguna"
          options={userTypeOptions}
          value={userType}
          onChange={(e) => setUserType(e.target.value as User["userType"])}
        />
        {userType === "internal_admin" && (
          <Select
            id="role"
            label="Role Global"
            options={roleOptions}
            value={role}
            onChange={(e) => setRole(e.target.value as User["role"])}
          />
        )}
      </div>

      {userType === "internal_pegawai" && (
        <div className="grid gap-4 sm:grid-cols-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
          <Input
            id="nip"
            label="NIP"
            value={nip}
            onChange={(e) => setNip(e.target.value)}
          />
          <Input
            id="jabatan"
            label="Jabatan"
            value={jabatan}
            onChange={(e) => setJabatan(e.target.value)}
          />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
              Unit Kerja
            </label>
            <select
              id="unitKerja"
              value={isCustomUnitKerja ? "__lainnya__" : (UNIT_KERJA_OPTIONS.includes(unitKerja) ? unitKerja : (unitKerja ? "__lainnya__" : ""))}
              onChange={(e) => {
                if (e.target.value === "__lainnya__") {
                  setUnitKerja("__lainnya__");
                } else {
                  setUnitKerja(e.target.value);
                  setUnitKerjaCustom("");
                }
              }}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">-- Pilih Unit Kerja --</option>
              {UNIT_KERJA_OPTIONS.map((uk) => (
                <option key={uk} value={uk}>{uk}</option>
              ))}
              <option value="__lainnya__">Lainnya (ketik manual)...</option>
            </select>
            {isCustomUnitKerja && (
              <input
                type="text"
                placeholder="Ketik unit kerja secara manual..."
                value={unitKerjaCustom}
                onChange={(e) => {
                  setUnitKerjaCustom(e.target.value);
                  setUnitKerja("__lainnya__");
                }}
                className="mt-2 w-full rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            )}
          </div>
        </div>
      )}

      {userType === "eksternal_masyarakat" && (
        <div className="grid gap-4 sm:grid-cols-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
          <Input
            id="noHp"
            label="No. WhatsApp / HP"
            value={noHp}
            onChange={(e) => setNoHp(e.target.value)}
          />
          <div className="sm:col-span-2">
            <Input
              id="alamat"
              label="Alamat Lengkap"
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Toggle
          checked={status === "active"}
          onChange={(checked) => setStatus(checked ? "active" : "inactive")}
          label="Akun Aktif"
        />
      </div>

      {userType === "internal_admin" && role !== "super_admin" && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
            Hak Akses per Aplikasi (RBAC) & Fitur
          </label>
          <div className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-800 p-4 max-h-[400px] overflow-y-auto">
            {appPermissions.map((perm) => {
              const currentApp = apps?.find(a => a.id === perm.appId);
              const availableFeatures = currentApp?.availableFeatures || [];
              
              return (
                <div
                  key={perm.appId}
                  className="flex flex-col gap-3 rounded-md bg-slate-50 dark:bg-slate-900/50 px-3 py-3 border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {perm.appName}
                    </span>
                    <div className="flex items-center gap-1">
                      {(["none", "viewer", "operator"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleAppRoleChange(perm.appId, r)}
                          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                            perm.role === r
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                              : "text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
                          }`}
                        >
                          {r === "none" ? "Tidak" : r === "viewer" ? "Viewer" : "Operator"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sub-features checkboxes */}
                  {perm.role !== "none" && (
                    <div className="pl-2 border-l-2 border-emerald-200 ml-1 mt-1 grid grid-cols-2 gap-2">
                      {availableFeatures.map(feat => (
                        <div key={feat.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`${perm.appId}-${feat.id}`}
                            checked={Array.isArray(perm.features) ? perm.features.includes(feat.id) : false}
                            onChange={(e) => handleFeatureToggle(perm.appId, feat.id, e.target.checked)}
                            className="rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 dark:bg-slate-800"
                          />
                          <label htmlFor={`${perm.appId}-${feat.id}`} className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                            {feat.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" loading={loading}>
          {initialData ? "Simpan Perubahan" : "Tambah Pengguna"}
        </Button>
      </div>
    </form>
  );
}
