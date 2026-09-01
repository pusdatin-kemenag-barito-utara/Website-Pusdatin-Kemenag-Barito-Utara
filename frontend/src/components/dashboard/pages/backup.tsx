import { useState, useMemo } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useBackupStatus,
  useBackupHistory,
  useTriggerBackup,
  useDeleteBackup,
  usePruneBackups,
  type BackupSnapshot,
} from "@/hooks/use-backup";
import {
  Database,
  ShieldCheck,
  Calendar,
  Layers,
  Download,
  Search,
  CheckCircle2,
  RefreshCcw,
  Clock,
  HardDrive,
  FileCode2,
  FileJson,
  Sparkles,
  Server,
  FolderArchive,
  ArrowDownToLine,
  Lock,
  Trash2,
  Eraser,
} from "lucide-react";
import { toast } from "@/components/ui/Toast";

function formatBytes(bytes: number) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDate(isoStr: string) {
  if (!isoStr) return "-";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoStr;
  }
}

export function BackupPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSnapshot, setSelectedSnapshot] = useState<BackupSnapshot | null>(null);
  const [snapshotToDelete, setSnapshotToDelete] = useState<BackupSnapshot | null>(null);

  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useBackupStatus();
  const { data: history, isLoading: historyLoading, refetch: refetchHistory, isFetching: historyFetching } = useBackupHistory();
  const triggerMutation = useTriggerBackup();
  const deleteMutation = useDeleteBackup();
  const pruneMutation = usePruneBackups();

  const isBackingUp = status?.isRunning || triggerMutation.isPending;

  const handleTriggerBackup = async () => {
    try {
      await triggerMutation.mutateAsync();
      toast("success", "Pencadangan database berhasil disimpan ke Cloudflare R2!");
      await Promise.all([refetchStatus(), refetchHistory()]);
    } catch (err: any) {
      toast("error", err?.message || "Gagal menjalankan backup database");
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refetchStatus(), refetchHistory()]);
    toast("success", "Status backup berhasil diperbarui");
  };

  const handleDeleteSnapshot = async () => {
    if (!snapshotToDelete) return;
    try {
      await deleteMutation.mutateAsync(snapshotToDelete.folder);
      toast("success", `Snapshot ${snapshotToDelete.folder} berhasil dihapus permanen dari Cloudflare R2`);
      setSnapshotToDelete(null);
      await Promise.all([refetchStatus(), refetchHistory()]);
    } catch (err: any) {
      toast("error", err?.message || "Gagal menghapus snapshot dari Cloudflare R2");
    }
  };

  const handlePruneOld = async () => {
    try {
      const res = await pruneMutation.mutateAsync(3);
      toast("success", res.message || "Pembersihan snapshot lama (> 3 hari) berhasil");
      await Promise.all([refetchStatus(), refetchHistory()]);
    } catch (err: any) {
      toast("error", err?.message || "Gagal membersihkan snapshot lama");
    }
  };

  const filteredSnapshots = useMemo(() => {
    const snaps = history?.snapshots || [];
    if (!searchQuery.trim()) return snaps;
    const q = searchQuery.toLowerCase();
    return snaps.filter(
      (s) =>
        s.folder.toLowerCase().includes(q) ||
        s.timestamp.toLowerCase().includes(q) ||
        (s.triggeredBy && s.triggeredBy.toLowerCase().includes(q))
    );
  }, [history?.snapshots, searchQuery]);

  const latestManifest = status?.latestManifest;

  return (
    <div className="space-y-8">
      {/* HEADER & TOP ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Database className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Pencadangan Database Supabase (Cloudflare R2)
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Sistem pencadangan otomatis menyeluruh (seluruh tabel & skema) setiap pukul 12 malam (00:00 WIB) ke Cloudflare R2 Object Storage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Target Bucket & Retention Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Bucket: <strong className="text-emerald-600 dark:text-emerald-400">{status?.targetBucket || "database-back-up-daily"}</strong></span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-slate-500">Retensi: <strong className="text-slate-800 dark:text-slate-200">3 Hari</strong></span>
          </div>

          {/* Prune Old Backups Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handlePruneOld}
            disabled={pruneMutation.isPending}
            icon={<Eraser className={`h-4 w-4 text-amber-500 ${pruneMutation.isPending ? "animate-spin" : ""}`} />}
            title="Bersihkan snapshot yang berusia lebih dari 3 hari dari Cloudflare R2"
          >
            Bersihkan &gt; 3 Hari
          </Button>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={historyFetching}
            icon={<RefreshCcw className={`h-4 w-4 ${historyFetching ? "animate-spin" : ""}`} />}
          >
            Segarkan
          </Button>

          {/* Manual Backup Trigger Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleTriggerBackup}
            disabled={isBackingUp}
            loading={isBackingUp}
            icon={<FolderArchive className="h-4 w-4" />}
          >
            {isBackingUp ? "Mencadangkan Database..." : "Backup Database Sekarang"}
          </Button>
        </div>
      </div>

      {/* SECTION 1: SYSTEM TELEMETRY & KPI SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Snapshots in R2 */}
        <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-all">
          <CardBody className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Snapshot di R2
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5">
                  {statusLoading ? <Skeleton className="h-8 w-20" /> : `${status?.totalSnapshots || 0} Arsip`}
                </h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <FolderArchive className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Tersimpan aman di Object Storage</span>
            </div>
          </CardBody>
        </Card>

        {/* Ukuran Terakhir */}
        <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-all">
          <CardBody className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Ukuran Backup Terakhir
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5">
                  {statusLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : latestManifest ? (
                    formatBytes(latestManifest.totalBytes)
                  ) : (
                    "0 B"
                  )}
                </h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <HardDrive className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{latestManifest ? `${latestManifest.totalRows.toLocaleString("id-ID")} Baris Data` : "Siap dicadangkan"}</span>
            </div>
          </CardBody>
        </Card>

        {/* Skema & Tabel Tercover (100% Otomatis) */}
        <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-all">
          <CardBody className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Cakupan Database
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5">
                  {statusLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : latestManifest ? (
                    `${latestManifest.totalSchemas} Skema`
                  ) : (
                    "100% Otomatis"
                  )}
                </h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                <Layers className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-medium">
              <Lock className="h-3.5 w-3.5" />
              <span>{latestManifest ? `${latestManifest.totalTables} Tabel Terproteksi` : "Introspeksi Dinamis Aktif"}</span>
            </div>
          </CardBody>
        </Card>

        {/* Jadwal Otomatis */}
        <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-all">
          <CardBody className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Jadwal Otomatis
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
                  00:00 WIB
                </h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <Calendar className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium truncate">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate" title={status?.nextRun || "Setiap Hari"}>
                Berikutnya: {status?.nextRun || "Tengah Malam"}
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* SECTION 2: DYNAMIC DATABASE SCHEMA COVERAGE MATRIX */}
      {latestManifest && latestManifest.schemas && latestManifest.schemas.length > 0 && (
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <Server className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Matriks Skema Database Terproteksi (Snapshot Terkini)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Setiap tabel baru di skema apapun secara otomatis terdeteksi dan tercadangkan ke file SQL independen
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              {latestManifest.schemas.length} Skema Terdeteksi
            </span>
          </CardHeader>
          <CardBody className="pt-4">
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {latestManifest.schemas.map((sc) => (
                <div
                  key={sc.schemaName}
                  className="flex flex-col justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        {sc.schemaName}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {sc.tableCount} Tabel • {sc.rowCount.toLocaleString("id-ID")} Baris
                      </p>
                    </div>
                    <FileCode2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">{formatBytes(sc.byteSize)}</span>
                    <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">{sc.fileName}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* SECTION 3: CLOUDFLARE R2 BACKUP SNAPSHOTS TABLE */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <FolderArchive className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Riwayat Snapshot di Cloudflare R2 ({status?.targetBucket || "database-back-up-daily"})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Daftar arsip pencadangan database harian yang dapat diunduh per skema atau secara penuh (*Full SQL Dump*)
            </p>
          </div>

          {/* Search Filter */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari folder snapshot / tanggal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/75 text-xs uppercase font-semibold text-slate-700 dark:text-slate-300 tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Folder Snapshot / Waktu</th>
                <th className="px-6 py-3.5">Jenis Eksekusi</th>
                <th className="px-6 py-3.5 text-center">Skema & Tabel</th>
                <th className="px-6 py-3.5 text-right">Total Baris Data</th>
                <th className="px-6 py-3.5 text-right">Ukuran Arsip</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-center">Aksi & Unduh</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {historyLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    <RefreshCcw className="h-6 w-6 animate-spin mx-auto text-slate-400 mb-2" />
                    Memuat riwayat snapshot dari Cloudflare R2...
                  </td>
                </tr>
              ) : filteredSnapshots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    <FolderArchive className="h-8 w-8 mx-auto text-slate-400 mb-2 opacity-50" />
                    Belum ada arsip snapshot database. Klik <strong>"Backup Database Sekarang"</strong> untuk membuat cadangan pertama.
                  </td>
                </tr>
              ) : (
                filteredSnapshots.map((snap) => (
                  <tr key={snap.folder} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    {/* Folder / Waktu */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0 border border-emerald-200/50 dark:border-emerald-800/50">
                          <FolderArchive className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white leading-tight font-mono text-xs">
                            {snap.folder}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {formatDate(snap.manifest?.timestamp || snap.timestamp)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Trigger */}
                    <td className="px-6 py-4">
                      {snap.triggeredBy === "scheduler_midnight" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                          <Clock className="h-3 w-3" />
                          Otomatis (00:00 WIB)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                          <Sparkles className="h-3 w-3" />
                          Manual (SuperAdmin)
                        </span>
                      )}
                    </td>

                    {/* Skema & Tabel */}
                    <td className="px-6 py-4 text-center font-semibold text-slate-800 dark:text-slate-200 text-xs">
                      {snap.totalSchemas > 0 ? (
                        <span>
                          {snap.totalSchemas} Skema ({snap.totalTables || 0} Tabel)
                        </span>
                      ) : (
                        <span>{snap.files.length} Berkas</span>
                      )}
                    </td>

                    {/* Total Baris */}
                    <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                      {(snap.totalRows || 0).toLocaleString("id-ID")}
                    </td>

                    {/* Ukuran */}
                    <td className="px-6 py-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                      {formatBytes(snap.totalBytes)}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                        <ShieldCheck className="h-3 w-3" />
                        SUKSES
                      </span>
                    </td>

                    {/* Aksi Unduh */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Tombol Unduh Full Dump */}
                        <a
                          href={`/api/backup/download?key=${snap.folder}/00_full_database_dump.sql`}
                          download
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm transition-all"
                          title="Unduh Full Database SQL Dump"
                        >
                          <ArrowDownToLine className="h-3.5 w-3.5" />
                          <span>Full Dump</span>
                        </a>

                        {/* Tombol Detail Berkas */}
                        <button
                          onClick={() => setSelectedSnapshot(snap)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <span>Rincian ({snap.files.length})</span>
                        </button>

                        {/* Tombol Hapus Snapshot */}
                        <button
                          onClick={() => setSnapshotToDelete(snap)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Hapus snapshot ini dari Cloudflare R2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DETAIL MODAL: BROWSE FILES IN SNAPSHOT */}
      <Dialog
        open={!!selectedSnapshot}
        onClose={() => setSelectedSnapshot(null)}
        title={`Rincian Berkas Backup: ${selectedSnapshot?.folder || ""}`}
        size="lg"
      >
        {selectedSnapshot && (
          <div className="space-y-4 p-4 sm:p-6 pt-2">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-500">Waktu Cadangan: </span>
                <strong className="text-slate-900 dark:text-white">
                  {formatDate(selectedSnapshot.manifest?.timestamp || selectedSnapshot.timestamp)}
                </strong>
              </div>
              <div>
                <span className="text-slate-500">Total Ukuran: </span>
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {formatBytes(selectedSnapshot.totalBytes)}
                </strong>
              </div>
              {selectedSnapshot.manifest?.checksumSha256 && (
                <div className="w-full pt-1.5 border-t border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-500 truncate">
                  SHA256: {selectedSnapshot.manifest.checksumSha256}
                </div>
              )}
            </div>

            {/* Files List */}
            <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
              {selectedSnapshot.files.map((file) => {
                const isFullDump = file.fileName.includes("full_database_dump");
                const isManifest = file.fileName.includes("manifest");

                return (
                  <div
                    key={file.key}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                      isFullDump
                        ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50"
                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          isFullDump
                            ? "bg-emerald-600 text-white"
                            : isManifest
                            ? "bg-amber-500 text-white"
                            : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                        }`}
                      >
                        {isManifest ? (
                          <FileJson className="h-4 w-4" />
                        ) : (
                          <FileCode2 className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white font-mono">
                          {file.fileName}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {formatBytes(file.size)}
                        </p>
                      </div>
                    </div>

                    <a
                      href={`/api/backup/download?key=${file.key}`}
                      download
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 transition-all"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Unduh</span>
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Dialog>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        open={!!snapshotToDelete}
        onClose={() => setSnapshotToDelete(null)}
        onConfirm={handleDeleteSnapshot}
        title="Hapus Snapshot Backup Permanen?"
        description={`Apakah Anda yakin ingin menghapus arsip ${snapshotToDelete?.folder || ""} dari Cloudflare R2? Seluruh berkas SQL di dalam folder ini akan dihapus secara permanen.`}
        confirmText="Ya, Hapus Permanen"
        cancelText="Batal"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
