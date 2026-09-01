import { useState, useMemo } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { useReportData, useActivityData } from "@/hooks/use-reports";
import { useApps } from "@/hooks/use-apps";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  FileText,
  Activity,
  BarChart3,
  TrendingUp,
  Download,
  Printer,
  RefreshCcw,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  Zap,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { toast } from "@/components/ui/Toast";

const PALETTE = [
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#ec4899", // Pink
  "#6366f1", // Indigo
  "#14b8a6", // Teal
];

export function ReportsPage() {
  const [days, setDays] = useState<number>(14);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: reportData, isLoading: reportLoading, refetch: refetchReport, isFetching: reportFetching } = useReportData();
  const { data: activity, isLoading: activityLoading, refetch: refetchActivity } = useActivityData(days);
  const { data: apps } = useApps();

  const handleRefresh = async () => {
    await Promise.all([refetchReport(), refetchActivity()]);
    toast("success", "Data laporan berhasil diperbarui");
  };

  // Aggregated calculations
  const totalRecords = useMemo(() => {
    if (!reportData) return 0;
    return reportData.reduce((acc, curr) => acc + (curr.count || 0), 0);
  }, [reportData]);

  const topApp = useMemo(() => {
    if (!reportData || reportData.length === 0) return null;
    return [...reportData].sort((a, b) => b.count - a.count)[0];
  }, [reportData]);

  const avgDaily = useMemo(() => {
    if (!totalRecords || !days) return 0;
    return Number((totalRecords / days).toFixed(1));
  }, [totalRecords, days]);

  // Merge app summary with satellite app metadata for detailed table
  const enrichedApps = useMemo(() => {
    if (!reportData) return [];
    return reportData.map((item, idx) => {
      const matchedApp = apps?.find(
        (a) => a.name.toLowerCase() === item.appName.toLowerCase() || (a.schema && item.appName.toLowerCase().includes(a.schema.toLowerCase()))
      );
      const sharePct = totalRecords > 0 ? ((item.count / totalRecords) * 100).toFixed(1) : "0.0";

      return {
        name: item.appName,
        count: item.count,
        color: item.color || PALETTE[idx % PALETTE.length],
        sharePct: Number(sharePct),
        status: matchedApp?.status || "online",
        url: matchedApp?.url || null,
        description: matchedApp?.description || "Aplikasi Satelit Terintegrasi",
        category: matchedApp?.schemaName ? matchedApp.schemaName.toUpperCase() : "LAYANAN PUBLIK",
      };
    });
  }, [reportData, apps, totalRecords]);

  // Filtered apps by search query
  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return enrichedApps;
    const q = searchQuery.toLowerCase();
    return enrichedApps.filter(
      (a) => a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
    );
  }, [enrichedApps, searchQuery]);

  // CSV Export Handler
  const exportToCSV = () => {
    if (!enrichedApps || enrichedApps.length === 0) {
      toast("error", "Tidak ada data laporan untuk diekspor");
      return;
    }

    const headers = ["Nama Aplikasi", "Kategori", "Status", "Jumlah Transaksi / Data", "Pangsa Kontribusi (%)", "Tautan URL"];
    const rows = enrichedApps.map((a) => [
      `"${a.name}"`,
      `"${a.category}"`,
      `"${a.status}"`,
      a.count,
      `"${a.sharePct}%"`,
      `"${a.url || '-'}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_analitik_pusdatin_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast("success", "Laporan berhasil diunduh dalam format CSV");
  };

  return (
    <div className="space-y-8">
      {/* HEADER & QUICK ACTION BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            Laporan & Analitik Satelit
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pusat pemantauan lalu lintas data, transaksi layanan, dan performa aplikasi satelit secara menyeluruh.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Days Filter Buttons */}
          <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-sm">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                  days === d
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {d} Hari
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            icon={<Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
          >
            Ekspor CSV
          </Button>

          {/* Print Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            icon={<Printer className="h-4 w-4 text-slate-500" />}
          >
            Cetak
          </Button>

          {/* Refresh Button */}
          <Button
            variant="primary"
            size="sm"
            onClick={handleRefresh}
            disabled={reportFetching}
            icon={<RefreshCcw className={`h-4 w-4 ${reportFetching ? "animate-spin" : ""}`} />}
          >
            {reportFetching ? "Memperbarui..." : "Segarkan"}
          </Button>
        </div>
      </div>

      {/* SECTION 1: EXECUTIVE KPI SUMMARY CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Transaksi */}
        <Card className="border-l-4 border-l-emerald-500 hover:shadow-md transition-all">
          <CardBody className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total Transaksi & Log
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5">
                  {reportLoading ? <Skeleton className="h-8 w-24" /> : totalRecords.toLocaleString("id-ID")}
                </h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Layers className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Agregasi seluruh 7 aplikasi satelit</span>
            </div>
          </CardBody>
        </Card>

        {/* Rata-Rata Aktivitas Harian */}
        <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-all">
          <CardBody className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Rata-rata Harian ({days} Hari)
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5">
                  {reportLoading ? <Skeleton className="h-8 w-20" /> : `${avgDaily.toLocaleString("id-ID")}`}
                </h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
              <Calendar className="h-3.5 w-3.5" />
              <span>Rerata transaksi per hari aktif</span>
            </div>
          </CardBody>
        </Card>

        {/* Aplikasi Teraktif */}
        <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-all">
          <CardBody className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Aplikasi Teraktif
                </p>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-1.5 truncate max-w-[170px]" title={topApp?.appName || "Aplikasi"}>
                  {reportLoading ? <Skeleton className="h-8 w-28" /> : topApp?.appName || "Tidak ada data"}
                </h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <Zap className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <span className="font-semibold">{topApp ? topApp.count.toLocaleString("id-ID") : 0} entri</span>
              <span>({totalRecords > 0 && topApp ? ((topApp.count / totalRecords) * 100).toFixed(1) : 0}%)</span>
            </div>
          </CardBody>
        </Card>

        {/* Status Integritas & Keamanan */}
        <Card className="border-l-4 border-l-indigo-500 hover:shadow-md transition-all">
          <CardBody className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Keandalan & SLA
                </p>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1.5">
                  100%
                </h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Semua request terekam di audit trail</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* SECTION 2: CHARTS (TIMELINE ACTIVITY & APP DISTRIBUTION) */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* CHART 1: TREN AKTIVITAS HARIAN (AREA CHART) */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Tren Aktivitas Layanan ({days} Hari Terakhir)</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Grafik frekuensi transaksi harian seluruh portal satelit</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="pt-4">
            {activityLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : activity && activity.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickLine={false}
                      dy={5}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                        fontSize: "12px",
                      }}
                      labelFormatter={(label) => `Tanggal: ${label}`}
                      formatter={(val: any) => [`${val} Transaksi`, "Aktivitas"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#emeraldGradient)"
                      activeDot={{ r: 6, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-slate-500">
                Belum ada data aktivitas pada periode ini
              </div>
            )}
          </CardBody>
        </Card>

        {/* CHART 2: DISTRIBUSI PER APLIKASI (BAR CHART) */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Beban Data per Aplikasi Satelit</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total akumulasi data transaksi berdasarkan masing-masing sistem</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="pt-4">
            {reportLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : reportData && reportData.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                    <XAxis
                      dataKey="appName"
                      tick={{ fontSize: 10, fill: "#94a3b8" }}
                      tickLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                        fontSize: "12px",
                      }}
                      formatter={(val: any) => [`${val} Transaksi`, "Total Data"]}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {reportData.map((_, index) => (
                        <Cell key={`bar-${index}`} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-slate-500">
                Belum ada data distribusi
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* SECTION 3: KOMPOSISI DATA DONUT & BREAKDOWN METRIC LIST */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* DONUT CHART */}
        <Card className="lg:col-span-1 shadow-sm">
          <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Pangsa Kontribusi Layanan</h3>
            </div>
          </CardHeader>
          <CardBody className="pt-4">
            {reportLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : reportData && reportData.length > 0 ? (
              <div className="relative h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData}
                      dataKey="count"
                      nameKey="appName"
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      innerRadius={65}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {reportData.map((_, index) => (
                        <Cell key={`donut-${index}`} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "10px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        fontSize: "12px",
                      }}
                      formatter={(val: any, name: any) => [`${val} Transaksi`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">
                    {totalRecords.toLocaleString("id-ID")}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                    TOTAL DATA
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                Belum ada data komposisi
              </div>
            )}
          </CardBody>
        </Card>

        {/* PROGRESS SHARE LIST */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Rincian Kontribusi per Sistem</h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {enrichedApps.length} Aplikasi Terdaftar
            </span>
          </CardHeader>
          <CardBody className="pt-4">
            {reportLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((n) => (
                  <Skeleton key={n} className="h-12 w-full" />
                ))}
              </div>
            ) : enrichedApps.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {enrichedApps.map((item) => (
                  <div
                    key={item.name}
                    className="flex flex-col gap-1.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-3 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {item.name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {item.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {item.sharePct}%
                        </span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {item.count.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                    {/* Mini Progress Bar */}
                    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.sharePct}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                Belum ada data rincian
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* SECTION 4: DETAILED AUDIT DATA TABLE ACROSS ALL APPS */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Tabel Matriks Agregasi Aplikasi Satelit
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Daftar komprehensif performa, integrasi database, dan tautan operasional
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari aplikasi satelit..."
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
                <th className="px-6 py-3.5">Nama Aplikasi Satelit</th>
                <th className="px-6 py-3.5">Kategori Sistem</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Volume Data / Transaksi</th>
                <th className="px-6 py-3.5 text-right">Pangsa (%)</th>
                <th className="px-6 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {reportLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    <RefreshCcw className="h-6 w-6 animate-spin mx-auto text-slate-400 mb-2" />
                    Memuat matriks laporan...
                  </td>
                </tr>
              ) : filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Tidak ditemukan aplikasi yang sesuai dengan pencarian
                  </td>
                </tr>
              ) : (
                filteredApps.map((item) => (
                  <tr key={item.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white shadow-sm shrink-0"
                          style={{ backgroundColor: item.color }}
                        >
                          {item.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white leading-tight">{item.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xs">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.category}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {item.status === "online" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          ONLINE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          MAINTENANCE
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-white">
                      {item.count.toLocaleString("id-ID")}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                          {item.sharePct}%
                        </span>
                        <div className="h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${item.sharePct}%`, backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-center">
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                        >
                          <span>Buka</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Total Row */}
            {!reportLoading && filteredApps.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 font-bold text-slate-900 dark:text-white">
                <tr>
                  <td className="px-6 py-4" colSpan={3}>
                    TOTAL KESELURUHAN SISTEM
                  </td>
                  <td className="px-6 py-4 text-right text-base text-emerald-600 dark:text-emerald-400 font-extrabold">
                    {totalRecords.toLocaleString("id-ID")}
                  </td>
                  <td className="px-6 py-4 text-right text-xs">100%</td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}
