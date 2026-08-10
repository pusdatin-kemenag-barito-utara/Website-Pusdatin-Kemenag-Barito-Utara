"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dialog } from "@/components/ui/Dialog";
import { Table } from "@/components/ui/Table";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { Plus, Edit, Search, Trash2 } from "lucide-react";
import { useUsers } from "@/hooks/use-users";

interface Pejabat {
  id: string;
  tipePejabat: string;
  unitKerja: string | null;
  nama: string;
  email: string;
  nip: string | null;
  jabatan: string | null;
  orderIndex: number;
}

const UNIT_KERJA_OPTIONS = [
  "Sub Bagian Tata Usaha",
  "Seksi Pendidikan Madrasah",
  "Seksi Pendidikan Agama Islam",
  "Seksi Pendidikan Diniyah & Pondok Pesantren",
  "Seksi Bimbingan Masyarakat Islam",
  "Penyelenggara Zakat dan Wakaf",
  "Penyelenggara Hindu",
  "KUA Kecamatan Teweh Tengah",
  "KUA Kecamatan Lahei",
  "KUA Kecamatan Gunung Purei",
  "KUA Kecamatan Montallat",
  "KUA Kecamatan Gunung Timang",
];

export default function PejabatPage() {
  const [data, setData] = useState<Pejabat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [tipePejabat, setTipePejabat] = useState("Atasan Langsung");
  const [orderIndex, setOrderIndex] = useState(0);
  const [selectedPegawaiId, setSelectedPegawaiId] = useState("");
  const [nipInput, setNipInput] = useState("");
  const [unitKerja, setUnitKerja] = useState("");
  
  const { data: pegawaiList } = useUsers({ userType: "internal_pegawai" });

  const fetchPejabat = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/pejabat");
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        toast("error", "Gagal mengambil data pejabat");
      }
    } catch (e) {
      toast("error", "Terjadi kesalahan sistem");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPejabat();
  }, []);

  const handleOpenForm = (pejabat?: Pejabat) => {
    if (pejabat) {
      setEditingId(pejabat.id);
      setSelectedPegawaiId(pejabat.id);
      setTipePejabat(pejabat.tipePejabat);
      setOrderIndex(pejabat.orderIndex);
      setUnitKerja(pejabat.unitKerja || "");
    } else {
      setEditingId(null);
      setSelectedPegawaiId("");
      setNipInput("");
      setTipePejabat("Atasan Langsung");
      setOrderIndex(0);
      setUnitKerja("");
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
        id: selectedPegawaiId, 
        tipePejabat, 
        orderIndex,
        unitKerja: tipePejabat === "Atasan Langsung" ? unitKerja : null
      };
      const url = editingId ? `/api/pejabat/${editingId}` : "/api/pejabat";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast("success", `Data pejabat berhasil ${editingId ? "diperbarui" : "ditambahkan"}`);
        setShowForm(false);
        fetchPejabat();
      } else {
        const json = await res.json();
        toast("error", json.message || "Gagal menyimpan data");
      }
    } catch (e) {
      toast("error", "Terjadi kesalahan sistem");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data pejabat ini?")) return;
    try {
      const res = await fetch(`/api/pejabat/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast("success", "Data pejabat berhasil dihapus");
        fetchPejabat();
      } else {
        toast("error", "Gagal menghapus data");
      }
    } catch (e) {
      toast("error", "Terjadi kesalahan sistem");
    }
  };

  const filtered = data.filter((d) => 
    d.nama.toLowerCase().includes(search.toLowerCase()) || 
    (d.nip || d.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.unitKerja || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen Pejabat</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola data Atasan Langsung dan Pejabat Berwenang tersinkronisasi untuk seluruh layanan satelit.
          </p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => handleOpenForm()}>
          Tambah Pejabat
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Cari pejabat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 pl-10 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20"
            />
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <Table<Pejabat>
            columns={[
              {
                key: "tipePejabat",
                header: "Tipe Pejabat",
                render: (row) => <span className="font-medium text-slate-900 dark:text-slate-200">{row.tipePejabat}</span>
              },
              {
                key: "nama",
                header: "Nama Pejabat",
                render: (row) => {
                  const fallbackNip = row.email && row.email.includes("@") ? row.email.split("@")[0] : "-";
                  return (
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-200">{row.nama}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{row.nip || fallbackNip}</p>
                    </div>
                  );
                }
              },
              {
                key: "jabatan",
                header: "Jabatan",
                render: (row) => <span className="text-slate-700 dark:text-slate-300">{row.jabatan || "-"}</span>
              },
              {
                key: "unitKerja",
                header: "Unit Kerja",
                render: (row) => <span className="text-slate-700 dark:text-slate-300">{row.unitKerja || "-"}</span>
              },
              {
                key: "actions",
                header: "Aksi",
                render: (row) => (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenForm(row)}
                      className="inline-flex items-center justify-center rounded-lg p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="inline-flex items-center justify-center rounded-lg p-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              }
            ]}
            data={filtered}
            loading={loading}
            keyExtractor={(item) => item.id}
          />
        </CardBody>
      </Card>

      <Dialog
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? "Edit Pejabat" : "Tambah Pejabat Baru"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            id="tipePejabat"
            label="Tipe Pejabat"
            value={tipePejabat}
            onChange={(e) => setTipePejabat(e.target.value)}
            options={[
              { value: "Atasan Langsung", label: "Atasan Langsung" },
              { value: "Pejabat Berwenang", label: "Pejabat Berwenang" },
            ]}
            required
          />
          {!editingId ? (
            <div className="space-y-3">
              <Input
                id="nipSearch"
                label="Cari Pegawai (Berdasarkan NIP)"
                list="pegawai-list"
                placeholder="Ketik atau paste NIP di sini..."
                value={nipInput}
                onChange={(e) => {
                  setNipInput(e.target.value);
                  const found = pegawaiList?.find(
                    (p) =>
                      (p.nip === e.target.value || p.email === e.target.value) &&
                      !data.some((d) => d.id === p.id)
                  );
                  setSelectedPegawaiId(found ? found.id : "");
                }}
                required
              />
              <datalist id="pegawai-list">
                {pegawaiList
                  ?.filter((p) => !data.some((d) => d.id === p.id))
                  .map((p) => (
                    <option key={p.id} value={p.nip || p.email}>
                      {p.name}
                    </option>
                  ))}
              </datalist>

              {selectedPegawaiId ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-100 dark:border-emerald-800">
                  <p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-bold mb-1">
                    Pegawai Terpilih:
                  </p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {pegawaiList?.find((p) => p.id === selectedPegawaiId)?.name}
                  </p>
                </div>
              ) : nipInput.length > 8 ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg border border-amber-100 dark:border-amber-800">
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    NIP tidak ditemukan atau pegawai sudah menjadi pejabat.
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Pegawai Terpilih</label>
              <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                {data.find(d => d.id === editingId)?.nama}
              </div>
            </div>
          )}
          
          {tipePejabat === "Atasan Langsung" && (
            <Select
              id="unitKerja"
              label="Unit Kerja (Atasan Langsung)"
              value={unitKerja}
              onChange={(e) => setUnitKerja(e.target.value)}
              options={[
                { value: "", label: "Pilih Unit Kerja" },
                ...UNIT_KERJA_OPTIONS.map(u => ({ value: u, label: u }))
              ]}
              required
            />
          )}
          <Input
            id="orderIndex"
            label="Urutan Tampilan (Opsional)"
            type="number"
            value={orderIndex}
            onChange={(e) => setOrderIndex(Number(e.target.value))}
          />
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Batal
            </Button>
            <Button type="submit">
              Simpan Data
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
