"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import { UserForm } from "@/components/users/UserForm";
import { useUser, useUpdateUser, useDeleteUser } from "@/hooks/use-users";
import { useApps } from "@/hooks/use-apps";
import { toast } from "@/components/ui/Toast";
import { 
  ArrowLeft, 
  Trash2, 
  User as UserIcon, 
  Shield, 
  Calendar, 
  Activity, 
  Briefcase,
  MonitorSmartphone,
  CheckCircle2
} from "lucide-react";
import { useState } from "react";
import type { User } from "@/types";



export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: user, isLoading, isError, error } = useUser(id);
  console.log("[DEBUG UserDetail]", { id, user, isLoading, isError, error });
  const { data: apps } = useApps();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handleUpdate = async (data: Partial<User>) => {
    try {
      await updateUser.mutateAsync({ id, data });
      toast("success", "Pengguna berhasil diperbarui");
      setShowEdit(false);
    } catch {
      toast("error", "Gagal memperbarui pengguna");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser.mutateAsync(id);
      toast("success", "Pengguna berhasil dihapus");
      router.push("/dashboard/users");
    } catch {
      toast("error", "Gagal menghapus pengguna");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-64 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-500">
        Pengguna tidak ditemukan
      </div>
    );
  }
  
  console.log("[DEBUG Pre-render UserDetail]", JSON.parse(JSON.stringify(user)));
  console.log("Checking fields:", { 
    hasAppPermissions: !!user.appPermissions,
    isAppPermissionsArray: Array.isArray(user.appPermissions),
    hasCreatedAt: !!user.createdAt,
    hasApps: !!apps
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => {
            if (user) {
              const params = new URLSearchParams();
              if (user.userType) params.set("type", user.userType);
              if (user.role && user.userType === "internal_admin") params.set("tab", user.role);
              router.push(`/dashboard/users?${params.toString()}`);
            } else {
              router.back();
            }
          }}>
            <ArrowLeft className="h-5 w-5 text-slate-500" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <img
                src="/branding/kemenag.svg"
                alt="Kemenag"
                className="h-8 w-8 object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{user.name}</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowEdit(true)}>
            Edit Profil
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDelete(true)}
            icon={<Trash2 className="h-4 w-4" />}
          >
            Hapus
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-emerald-600" />
              Informasi Akun
            </h3>
          </CardHeader>
          <CardBody className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                <Briefcase className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Tipe Pengguna</p>
                <Badge variant="info">
                  {user.userType === "internal_admin"
                    ? "Admin Internal"
                    : user.userType === "internal_pegawai"
                      ? "Pegawai (PTSP)"
                      : user.userType === "eksternal_masyarakat"
                        ? "Masyarakat Umum"
                        : user.userType}
                </Badge>
              </div>
            </div>

            {user.userType === "internal_admin" && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                  <Shield className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Role Global</p>
                  <Badge
                    variant={
                      user.role === "super_admin"
                        ? "info"
                        : user.role === "sub_admin"
                        ? "secondary"
                        : "default"
                    }
                  >
                    {user.role === "super_admin"
                      ? "Super Admin"
                      : user.role === "sub_admin"
                      ? "Sub Admin"
                      : "Admin"}
                  </Badge>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                <Activity className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Status Akun</p>
                <Badge variant={user.status === "active" ? "success" : "default"}>
                  {user.status === "active" ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <Calendar className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">Bergabung Sejak</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {new Date(user.createdAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="lg:col-span-2">
          <Card className="shadow-sm border-slate-200/60 dark:border-slate-800/60 h-full">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                Hak Akses Aplikasi & Fitur (RBAC)
              </h3>
            </CardHeader>
            <CardBody>
              {user.appPermissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                  <MonitorSmartphone className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-sm font-medium">Belum ada hak akses aplikasi yang diberikan.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {user.appPermissions.map((perm) => {
                    const currentApp = apps?.find(a => a.id === perm.appId);
                    const availableFeatures = currentApp?.availableFeatures || [];
                    
                    return (
                      <div
                        key={perm.appId}
                        className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <MonitorSmartphone className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                              {perm.appName}
                            </span>
                          </div>
                          <Badge
                            variant={
                              perm.role === "operator"
                                ? "success"
                                : perm.role === "viewer"
                                  ? "info"
                                  : "default"
                            }
                          >
                            {perm.role === "operator"
                              ? "Operator"
                              : perm.role === "viewer"
                                ? "Viewer"
                                : "Tidak ada"}
                          </Badge>
                        </div>
                        
                        <div className="p-4 bg-white dark:bg-slate-950 flex-1">
                          <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-3">Fitur Terbuka</p>
                          {(!perm.features || perm.features.length === 0) ? (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic">Tidak ada fitur spesifik.</p>
                          ) : (
                            <ul className="space-y-2">
                              {(Array.isArray(perm.features) ? perm.features : []).map(featId => {
                                const featLabel = availableFeatures.find(f => f.id === featId)?.label || featId;
                                return (
                                  <li key={featId} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>{featLabel}</span>
                                  </li>
                                )
                              })}
                            </ul>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Dialog
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="Edit Pengguna"
        size="xl"
      >
        <UserForm
          initialData={user}
          onSubmit={handleUpdate}
          onCancel={() => setShowEdit(false)}
          loading={updateUser.isPending}
        />
      </Dialog>

      <Dialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Hapus Pengguna"
        size="sm"
      >
        <p className="text-sm text-slate-600">
          Apakah Anda yakin ingin menghapus pengguna{" "}
          <span className="font-semibold">{user.name}</span>? Tindakan ini tidak
          dapat dibatalkan.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowDelete(false)}>
            Batal
          </Button>
          <Button
            variant="danger"
            loading={deleteUser.isPending}
            onClick={handleDelete}
          >
            Hapus
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
