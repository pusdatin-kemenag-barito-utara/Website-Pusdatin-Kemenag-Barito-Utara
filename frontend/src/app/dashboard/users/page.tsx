"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { UserTable } from "@/components/users/UserTable";
import { UserForm } from "@/components/users/UserForm";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@/hooks/use-users";
import { useApps } from "@/hooks/use-apps";
import { toast } from "@/components/ui/Toast";
import type { User } from "@/types";
import { Plus, Search, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { exportToCsv } from "@/lib/utils";

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appId = searchParams.get("appId") || undefined;
  const userType = (searchParams.get("type") as string) || "internal_admin";
  const { data: users, isLoading } = useUsers({ appId, userType });
  const { data: apps } = useApps();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const tabParam = searchParams.get("tab") as "super_admin" | "admin" | "sub_admin";
  const [activeTab, setActiveTab] = useState<"super_admin" | "admin" | "sub_admin">(tabParam || "super_admin");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  let filtered = users?.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  if (filtered && sortKey) {
    filtered = [...filtered].sort((a, b) => {
      let aVal: string = "";
      let bVal: string = "";

      if (sortKey === "name") {
        aVal = a.name;
        bVal = b.name;
      } else if (sortKey === "nip") {
        aVal = a.nip || (a.email.includes("@") ? a.email.split("@")[0] : "");
        bVal = b.nip || (b.email.includes("@") ? b.email.split("@")[0] : "");
      } else if (sortKey === "jabatan") {
        aVal = a.jabatan || "";
        bVal = b.jabatan || "";
      } else if (sortKey === "unitKerja") {
        aVal = a.unitKerja || "";
        bVal = b.unitKerja || "";
      } else if (sortKey === "noHp") {
        aVal = a.noHp || "";
        bVal = b.noHp || "";
      } else if (sortKey === "role") {
        aVal = a.role;
        bVal = b.role;
      } else {
        aVal = String((a as any)[sortKey] || "");
        bVal = String((b as any)[sortKey] || "");
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleSubmit = async (data: Partial<User>) => {
    try {
      if (editingUser) {
        await updateUser.mutateAsync({ id: editingUser.id, data });
        toast("success", "Pengguna berhasil diperbarui");
      } else {
        await createUser.mutateAsync(data);
        toast("success", "Pengguna berhasil ditambahkan");
      }
      setShowForm(false);
    } catch {
      toast("error", `Gagal ${editingUser ? "memperbarui" : "menambahkan"} pengguna`);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleDelete = (user: User) => {
    setDeletingUser(user);
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;
    try {
      await deleteUser.mutateAsync(deletingUser.id);
      toast("success", "Pengguna berhasil dihapus");
    } catch (error: any) {
      toast("error", error.message || "Gagal menghapus pengguna");
    } finally {
      setDeletingUser(null);
    }
  };

  const handleExportCsv = () => {
    if (!filtered) return;
    
    // According to request: Nama Pengguna, NIP, Gol/Ruang, Jabatan, unit kerja dan No HP
    const headers = ["Nama Pengguna", "NIP", "Gol/Ruang", "Jabatan", "Unit Kerja", "No HP", "Role"];
    
    let usersToExport = filtered;
    if (userType === "internal_admin") {
      usersToExport = filtered.filter((u) => u.role === activeTab);
    }

    const rows = usersToExport.map((u) => [
      u.name || "-",
      u.nip || "-",
      u.pangkatGolongan || "-",
      u.jabatan || "-",
      u.unitKerja || "-",
      u.noHp || "-",
      u.role || "-",
    ]);

    exportToCsv(`data_pengguna_${userType}.csv`, [headers, ...rows]);
  };

    const currentApp = apps?.find((a) => a.id === appId);
    let title = "Manajemen Pengguna";
    if (currentApp) {
      title = `Pengguna - ${currentApp.name}`;
    } else if (userType === "internal_admin") {
      title = "Admin Internal";
    } else if (userType === "internal_pegawai") {
      title = "Pegawai (PTSP)";
    } else if (userType === "eksternal_masyarakat") {
      title = "Masyarakat Umum";
    }

  const renderPagination = (totalItems: number) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null;

    const renderPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;
      
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = startPage + maxVisiblePages - 1;

      if (endPage > totalPages) {
        endPage = totalPages;
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(
          <Button
            key={i}
            variant={currentPage === i ? "primary" : "outline"}
            size="sm"
            onClick={() => setCurrentPage(i)}
            className={`w-9 h-9 p-0 flex items-center justify-center transition-all duration-200 rounded-lg ${
              currentPage === i 
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/20 border-emerald-600' 
                : 'hover:bg-slate-100 hover:text-slate-900 border-slate-200 text-slate-600 dark:hover:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
            }`}
          >
            {i}
          </Button>
        );
      }
      return pages;
    };

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 dark:border-slate-800 px-6 py-4 gap-4">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Menampilkan <span className="font-semibold text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}</span> hingga <span className="font-semibold text-slate-900 dark:text-white">{Math.min(currentPage * itemsPerPage, totalItems)}</span> dari <span className="font-semibold text-slate-900 dark:text-white">{totalItems}</span> data
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="w-9 h-9 p-0 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1">
            {renderPageNumbers()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => p + 1)}
            disabled={currentPage >= totalPages}
            className="w-9 h-9 p-0 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {currentApp ? `Kelola hak akses khusus untuk ${currentApp.name}` : `Kelola data ${title}`}
          </p>
        </div>
        {userType !== "eksternal_masyarakat" && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => {
            setEditingUser(null);
            setShowForm(true);
          }}>
            Tambah Pengguna
          </Button>
        )}
      </div>

      {userType === "internal_admin" ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex space-x-1 rounded-lg bg-slate-100 dark:bg-slate-900/50 p-1">
              {(["super_admin", "admin", "sub_admin"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("tab", tab);
                    router.push(`/dashboard/users?${params.toString()}`);
                  }}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab
                      ? "bg-white text-emerald-600 shadow-sm dark:bg-slate-800 dark:text-emerald-400"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {tab === "super_admin"
                    ? "Super Admin"
                    : tab === "admin"
                    ? "Admin"
                    : "Sub Admin"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder="Cari pengguna..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:border-emerald-500 dark:focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                />
              </div>
              <Button onClick={handleExportCsv} variant="primary" className="h-10 whitespace-nowrap bg-emerald-600 hover:bg-emerald-700">
                <Download className="w-4 h-4 mr-2" />
                Cetak CSV
              </Button>
            </div>
          </div>

          <Card>
            <CardBody className="p-0">
              <UserTable
                data={filtered?.filter((u) => u.role === activeTab).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) || []}
                loading={isLoading}
                isPegawai={false}
                onEdit={handleEdit}
                onDelete={handleDelete}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              {filtered && renderPagination(filtered.filter((u) => u.role === activeTab).length)}
            </CardBody>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder="Cari pengguna..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1); // Reset page on search
                  }}
                  className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:border-emerald-500 dark:focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                />
              </div>
              <Button onClick={handleExportCsv} variant="primary" className="h-10 whitespace-nowrap bg-emerald-600 hover:bg-emerald-700">
                <Download className="w-4 h-4 mr-2" />
                Cetak CSV
              </Button>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <UserTable
              data={filtered?.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) || []}
              loading={isLoading}
              isPegawai={userType === "internal_pegawai"}
              onEdit={handleEdit}
              onDelete={handleDelete}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
            />
            {filtered && renderPagination(filtered.length)}
          </CardBody>
        </Card>
      )}

      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingUser ? "Edit Pengguna" : "Tambah Pengguna Baru"}
        size="xl"
      >
        <UserForm
          initialData={editingUser || undefined}
          defaultUserType={userType}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          loading={createUser.isPending || updateUser.isPending}
        />
      </Dialog>

      <Dialog
        open={!!deletingUser}
        onClose={() => !deleteUser.isPending && setDeletingUser(null)}
        title="Hapus Pengguna"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Apakah Anda yakin ingin menghapus pengguna <strong className="text-slate-900 dark:text-white">{deletingUser?.name}</strong>? 
            Tindakan ini akan menghapus semua hak akses dan data login secara permanen.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={() => setDeletingUser(null)}
              disabled={deleteUser.isPending}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              loading={deleteUser.isPending}
              onClick={confirmDelete}
            >
              Ya, Hapus
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
