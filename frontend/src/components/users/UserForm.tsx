
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import type { User, AppPermission, SateliteApp } from "@/types";
import { useApps } from "@/hooks/use-apps";
import { UserCheck, Shield, Building2, User as UserIcon, Eye, EyeOff } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState(initialData?.role || "admin");
  const [userType, setUserType] = useState<User["userType"]>(
    initialData?.userType || (defaultUserType as User["userType"]) || "internal_admin"
  );
  const [status, setStatus] = useState<"active" | "inactive">(
    initialData?.status || "active",
  );

  const fallbackNip = (initialData?.email && initialData.email.includes("@")) ? initialData.email.split("@")[0] : "";
  const [nip, setNip] = useState(initialData?.nip || fallbackNip);
  const [jabatan, setJabatan] = useState(initialData?.jabatan || "");

  // Proper initialization of unitKerja & custom unit kerja
  const isInitialUnitKerjaCustom = !!(
    initialData?.unitKerja && !UNIT_KERJA_OPTIONS.includes(initialData.unitKerja)
  );

  const [unitKerjaSelect, setUnitKerjaSelect] = useState<string>(
    isInitialUnitKerjaCustom
      ? "__lainnya__"
      : initialData?.unitKerja || ""
  );
  const [unitKerjaCustom, setUnitKerjaCustom] = useState(
    isInitialUnitKerjaCustom ? initialData?.unitKerja || "" : ""
  );

  const isCustomUnitKerja = unitKerjaSelect === "__lainnya__";

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
        return apps.map((app: SateliteApp) => {
          const existing = prev.find((p) => p.appId === app.id);
          return existing || { appId: app.id, appName: app.name, role: "none" as const, features: [] };
        });
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
            : (p.features || []).filter((f) => f !== featureId);
          return { ...p, features: newFeatures };
        }
        return p;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalRole = role;
    if (userType === "internal_pegawai") {
      finalRole = "pegawai";
    } else if (userType === "eksternal_masyarakat") {
      finalRole = "user";
    }

    const finalUnitKerja = isCustomUnitKerja ? unitKerjaCustom : unitKerjaSelect;

    onSubmit({
      name,
      email,
      ...(password ? { password } : {}),
      role: finalRole,
      userType,
      status,
      ...((userType === "internal_pegawai" || userType === "internal_admin") ? { nip, jabatan, unitKerja: finalUnitKerja } : {}),
      ...(userType === "eksternal_masyarakat" ? { nik, noHp, alamat, pekerjaan } : {}),
      appPermissions: userType === "internal_admin" && finalRole !== "super_admin"
        ? appPermissions.filter((p) => p.role !== "none")
        : [],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* SECTION 1: Informasi Utama Akun */}
      <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
          <UserIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Informasi Akun</h4>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="name"
            label="Nama Lengkap"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Masukkan nama lengkap"
          />
          <Input
            id="email"
            label="Email / Akun"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="contoh@kemenag.go.id"
          />
          <div className="relative">
            <Input
              id="password"
              label={initialData ? "Password (kosongkan jika tidak diubah)" : "Password"}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!initialData}
              autoComplete="new-password"
              placeholder="••••••••"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[38px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
              title={showPassword ? "Sembunyikan Password" : "Tampilkan Password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
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

          <div className="flex items-center justify-between sm:col-span-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Status Keaktifan Akun</span>
            <Toggle
              checked={status === "active"}
              onChange={(checked) => setStatus(checked ? "active" : "inactive")}
              label={status === "active" ? "Aktif" : "Non-Aktif"}
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: Detail Identitas / Kepegawaian */}
      {(userType === "internal_pegawai" || userType === "internal_admin") && (
        <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Detail Kepegawaian & Instansi</h4>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="nip"
              label="NIP"
              value={nip}
              onChange={(e) => setNip(e.target.value)}
              placeholder="Masukkan NIP (18 digit)"
            />
            <Input
              id="jabatan"
              label="Jabatan"
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value)}
              placeholder="Contoh: Pranata Komputer"
            />
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Unit Kerja
              </label>
              <select
                id="unitKerja"
                value={unitKerjaSelect}
                onChange={(e) => {
                  const val = e.target.value;
                  setUnitKerjaSelect(val);
                  if (val !== "__lainnya__") {
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
                  onChange={(e) => setUnitKerjaCustom(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {userType === "eksternal_masyarakat" && (
        <div className="space-y-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Data Identitas Pemohon</h4>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="nik"
              label="NIK"
              value={nik}
              onChange={(e) => setNik(e.target.value)}
              placeholder="NIK (16 Digit)"
            />
            <Input
              id="noHp"
              label="No. WhatsApp / HP"
              value={noHp}
              onChange={(e) => setNoHp(e.target.value)}
              placeholder="08xxxxxxxxxx"
            />
            <Input
              id="pekerjaan"
              label="Pekerjaan"
              value={pekerjaan}
              onChange={(e) => setPekerjaan(e.target.value)}
              placeholder="Pekerjaan saat ini"
            />
            <div className="sm:col-span-2">
              <Input
                id="alamat"
                label="Alamat Lengkap"
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                placeholder="Alamat domisili lengkap"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: Hak Akses per Aplikasi (RBAC) */}
      {userType === "internal_admin" && role !== "super_admin" && (
        <div className="space-y-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Hak Akses per Aplikasi (RBAC) & Fitur
              </h4>
            </div>
            <span className="text-xs text-slate-500">Pilih level akses untuk setiap aplikasi</span>
          </div>

          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {appPermissions.map((perm) => {
              const currentApp = apps?.find((a: SateliteApp) => a.id === perm.appId);
              const availableFeatures = currentApp?.availableFeatures || [];

              return (
                <div
                  key={perm.appId}
                  className="flex flex-col gap-3 rounded-lg bg-white dark:bg-slate-950 p-3.5 border border-slate-200 dark:border-slate-800 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {perm.appName}
                    </span>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                      {(["none", "viewer", "operator"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleAppRoleChange(perm.appId, r)}
                          className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${
                            perm.role === r
                              ? "bg-emerald-600 text-white shadow-sm font-semibold"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                          }`}
                        >
                          {r === "none" ? "Tidak Ada" : r === "viewer" ? "Viewer" : "Operator"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sub-features checkboxes */}
                  {perm.role !== "none" && availableFeatures.length > 0 && (
                    <div className="pl-3 border-l-2 border-emerald-500 ml-1 mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-md">
                      {availableFeatures.map((feat: { id: string; label: string }) => (
                        <div key={feat.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`${perm.appId}-${feat.id}`}
                            checked={Array.isArray(perm.features) ? perm.features.includes(feat.id) : false}
                            onChange={(e) => handleFeatureToggle(perm.appId, feat.id, e.target.checked)}
                            className="rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 dark:bg-slate-800"
                          />
                          <label
                            htmlFor={`${perm.appId}-${feat.id}`}
                            className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                          >
                            {feat.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* FOOTER ACTIONS */}
      <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
        <Button type="button" variant="outline" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" loading={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          {initialData ? "Simpan Perubahan" : "Tambah Pengguna"}
        </Button>
      </div>
    </form>
  );
}
