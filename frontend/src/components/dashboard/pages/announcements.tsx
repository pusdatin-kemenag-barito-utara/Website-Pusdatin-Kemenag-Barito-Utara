import { useState, useEffect } from "react";
import {
  Megaphone,
  Plus,
  Search,
  Edit2,
  Trash2,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";
import {
  useAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
} from "@/hooks/use-announcements";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import type { Announcement } from "@/types";

const PRESET_TAGS = [
  "Integrasi SSO",
  "Pemeliharaan",
  "Helpdesk IT",
  "Informasi Utama",
  "Layanan Digital",
  "Pengumuman",
];

export function AnnouncementsPage() {
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Announcement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: announcements = [], isLoading } = useAnnouncements(search);
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const filteredItems = announcements.filter((item) => {
    if (tagFilter !== "all" && item.tag !== tagFilter) return false;
    return true;
  });

  const allTags = Array.from(new Set(announcements.map((a) => a.tag).filter(Boolean)));

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      toast("success", "Pengumuman berhasil dihapus");
      setDeletingId(null);
    } catch (err: any) {
      toast("error", err?.message || "Gagal menghapus pengumuman");
    }
  };

  const handleToggleActive = async (item: Announcement) => {
    try {
      const nextState = !item.isActive;
      await updateMutation.mutateAsync({
        id: item.id,
        data: { isActive: nextState },
      });
      toast("success", `Pengumuman ${nextState ? "diaktifkan" : "dinonaktifkan"}`);
    } catch (err: any) {
      toast("error", err?.message || "Gagal mengubah status");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Manajemen Pengumuman
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
              {announcements.length} Data
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola rilis informasi resmi dan pembaruan sistem untuk portal publik Pusdatin.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Tambah Pengumuman
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Input
            placeholder="Cari judul atau isi pengumuman..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search className="h-4 w-4 text-slate-400" />}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setTagFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              tagFilter === "all"
                ? "bg-[#006838] text-white font-semibold"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            Semua Tag
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setTagFilter(tag)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                tagFilter === tag
                  ? "bg-[#006838] text-white font-semibold"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Main List Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent mx-auto" />
            <p className="text-sm text-slate-500">Memuat data pengumuman...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Megaphone className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-base font-medium text-slate-700 dark:text-slate-300">
              Belum ada pengumuman
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search
                ? "Tidak ada pengumuman yang cocok dengan kueri pencarian."
                : "Klik tombol Tambah Pengumuman untuk membuat pengumuman pertama Anda."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4">Informasi Pengumuman</th>
                  <th className="px-6 py-4">Kategori Tag</th>
                  <th className="px-6 py-4">Prioritas</th>
                  <th className="px-6 py-4">Status Publikasi</th>
                  <th className="px-6 py-4">Tanggal Rilis</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 max-w-md">
                      <div className="font-semibold text-slate-900 dark:text-white text-base">
                        {item.title}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        <Layers className="h-3 w-3 text-slate-400" />
                        {item.tag}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.isImportant ? (
                        <Badge variant="warning" className="flex items-center gap-1 w-fit">
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          Utama
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Standar</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(item)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer border ${
                          item.isActive
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200"
                        }`}
                        title="Klik untuk mengubah status aktif"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                          }`}
                        />
                        {item.isActive ? "Aktif / Publik" : "Draf / Nonaktif"}
                      </button>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>{item.createdAt ? item.createdAt.split(" ")[0] : "-"}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingItem(item)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition-colors"
                          title="Edit Pengumuman"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(item.id)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                          title="Hapus Pengumuman"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit Pengumuman */}
      <AnnouncementFormModal
        open={isCreateOpen || !!editingItem}
        item={editingItem}
        onClose={() => {
          setIsCreateOpen(false);
          setEditingItem(null);
        }}
        onSubmit={async (formData) => {
          try {
            if (editingItem) {
              await updateMutation.mutateAsync({ id: editingItem.id, data: formData });
              toast("success", "Pengumuman berhasil diperbarui");
            } else {
              await createMutation.mutateAsync(formData);
              toast("success", "Pengumuman baru berhasil diterbitkan");
            }
            setIsCreateOpen(false);
            setEditingItem(null);
          } catch (err: any) {
            toast("error", err?.message || "Gagal menyimpan pengumuman");
          }
        }}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Modal Konfirmasi Hapus */}
      <ConfirmDialog
        open={!!deletingId}
        title="Hapus Pengumuman"
        description="Apakah Anda yakin ingin menghapus pengumuman ini? Pengumuman yang dihapus tidak akan tampil lagi di portal publik."
        confirmText="Hapus Sekarang"
        cancelText="Batal"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeletingId(null)}
      />
    </div>
  );
}

interface FormModalProps {
  open: boolean;
  item: Announcement | null;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  loading: boolean;
}

function AnnouncementFormModal({ open, item, onClose, onSubmit, loading }: FormModalProps) {
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("Informasi");
  const [description, setDescription] = useState("");
  const [isImportant, setIsImportant] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Sync when item changes or modal opens
  useEffect(() => {
    if (open) {
      if (item) {
        setTitle(item.title);
        setTag(item.tag);
        setDescription(item.description);
        setIsImportant(item.isImportant);
        setIsActive(item.isActive);
      } else {
        setTitle("");
        setTag("Informasi");
        setDescription("");
        setIsImportant(false);
        setIsActive(true);
      }
    }
  }, [item, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title: title.trim(),
      tag: tag.trim() || "Informasi",
      description: description.trim(),
      isImportant,
      isActive,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={item ? "Edit Pengumuman" : "Buat Pengumuman Baru"}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Judul Pengumuman <span className="text-red-500">*</span>
          </label>
          <Input
            required
            placeholder="Contoh: Pembaruan Jadwal Layanan PTSP..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Kategori / Tag
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
            {PRESET_TAGS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTag(t)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition-all ${
                  tag === t
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Isi Lengkap Deskripsi <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            placeholder="Tuliskan isi pengumuman dan arahan bagi pengguna..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isImportant}
              onChange={(e) => setIsImportant(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Tandai sebagai Informasi Utama (Badge Khusus)
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Publikasikan Sekarang (Aktif)
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button type="submit" loading={loading} className="bg-emerald-600 text-white">
            {item ? "Simpan Perubahan" : "Terbitkan Pengumuman"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
