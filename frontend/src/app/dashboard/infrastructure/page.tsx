"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Database, HardDrive, Files, RefreshCcw, Cpu, MemoryStick, Activity, Network, Clock, Server } from "lucide-react";
import { Button } from "@/components/ui/Button";

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function formatUptime(seconds: number) {
  if (!seconds) return 'N/A';
  const d = Math.floor(seconds / (3600*24));
  const h = Math.floor(seconds % (3600*24) / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  if (d > 0) return `${d}h ${h}j ${m}m`;
  return `${h}j ${m}m`;
}

export default function InfrastructurePage() {
  // Real-time VPS System Metrics
  const { data: sys, isLoading: sysLoading } = useQuery({
    queryKey: ['system-realtime'],
    queryFn: async () => {
      const res = await fetch('/api/system/realtime');
      if (!res.ok) throw new Error('Failed to fetch realtime stats');
      return res.json();
    },
    refetchInterval: 3000, // Every 3 seconds
  });

  // R2 Buckets Data
  const { data: r2, isLoading: r2Loading, isError: r2Error, refetch: r2Refetch, isFetching: r2Fetching } = useQuery({
    queryKey: ['r2-buckets'],
    queryFn: async () => {
      const res = await fetch('/api/r2/buckets');
      if (!res.ok) throw new Error('Failed to fetch R2 buckets');
      return res.json();
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const buckets = r2?.buckets || [];
  const totalBuckets = buckets.length;
  const totalStorage = buckets.reduce((acc: number, bucket: any) => acc + Number(bucket.usage?.payloadSize || 0), 0);
  const totalObjects = buckets.reduce((acc: number, bucket: any) => acc + Number(bucket.usage?.objectCount || 0), 0);

  const cpuVal = sys?.cpu?.load ?? 0;
  const ramVal = sys?.ram?.total ? (sys.ram.used / sys.ram.total) * 100 : 0;
  const storageVal = sys?.storage?.total ? (sys.storage.used / sys.storage.total) * 100 : 0;
  
  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Infrastruktur & Storage</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Pusat kendali VPS (Real-time) dan Cloudflare R2 Object Storage
          </p>
        </div>
      </div>

      {/* SECTION 1: VPS REAL-TIME METRICS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <Server className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Server Monitoring (Live)</h2>
          {sysLoading && <RefreshCcw className="h-4 w-4 animate-spin text-slate-400 ml-2" />}
        </div>
        
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* CPU */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <Cpu className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <ProgressBar
                    label="CPU Load"
                    subtitle={sys?.cpu?.cores ? `${sys.cpu.cores} Cores` : '...'}
                    value={cpuVal}
                    variant={cpuVal > 80 ? "danger" : cpuVal > 60 ? "warning" : "default"}
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* RAM */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                  <MemoryStick className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <ProgressBar
                    label="RAM Usage"
                    subtitle={sys?.ram?.total ? `${formatBytes(sys.ram.used)} / ${formatBytes(sys.ram.total)}` : '...'}
                    value={ramVal}
                    variant={ramVal > 80 ? "danger" : ramVal > 60 ? "warning" : "default"}
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* STORAGE */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                  <HardDrive className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <ProgressBar
                    label="Penyimpanan"
                    subtitle={sys?.storage?.total ? `${formatBytes(sys.storage.used, 0)} / ${formatBytes(sys.storage.total, 0)}` : '...'}
                    value={storageVal}
                    variant={storageVal > 80 ? "danger" : storageVal > 60 ? "warning" : "default"}
                  />
                </div>
              </div>
            </CardBody>
          </Card>

          {/* NETWORK */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Network className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Network Traffic</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">RX (In): <span className="font-semibold text-emerald-600">{formatBytes(sys?.network?.rxSec || 0)}/s</span></span>
                    <span className="text-slate-500">TX (Out): <span className="font-semibold text-emerald-600">{formatBytes(sys?.network?.txSec || 0)}/s</span></span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* LOAD AVG & UPTIME */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                  <Activity className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Load & Uptime</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500" title="Load Average (1m, 5m, 15m)">
                      Load: <span className="font-semibold">{sys?.cpu?.avgLoad ? sys.cpu.avgLoad.toFixed(2) : '-'}</span>
                    </span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3"/> {formatUptime(sys?.uptime)}
                    </span>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* SECTION 2: R2 STORAGE */}
      <div className="space-y-4 pt-6">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Cloudflare R2 Storage</h2>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => r2Refetch()}
            disabled={r2Fetching}
            icon={<RefreshCcw className={`h-4 w-4 ${r2Fetching ? 'animate-spin' : ''}`} />}
          >
            {r2Fetching ? "Memperbarui..." : "Perbarui Data"}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardBody>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                  <Database className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Buckets</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {r2Loading ? "-" : totalBuckets}
                  </h3>
                </div>
              </div>
            </CardBody>
          </Card>
          
          <Card>
            <CardBody>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                  <HardDrive className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Storage (R2)</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {r2Loading ? "-" : formatBytes(totalStorage)}
                  </h3>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <Files className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Objects</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {r2Loading ? "-" : totalObjects.toLocaleString()}
                  </h3>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900 dark:text-white">Daftar Buckets</h3>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="border-y border-slate-200 bg-slate-50/50 text-slate-900 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white">
                <tr>
                  <th className="px-6 py-4 font-medium">Buckets</th>
                  <th className="px-6 py-4 font-medium text-right">Objects</th>
                  <th className="px-6 py-4 font-medium text-right">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {r2Loading && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                      <RefreshCcw className="h-6 w-6 animate-spin mx-auto text-slate-400 mb-2" />
                      Memuat data buckets...
                    </td>
                  </tr>
                )}
                
                {r2Error && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-red-500">
                      <p>Gagal memuat data R2.</p>
                      <p className="text-xs mt-1 text-red-400">Pastikan API token Cloudflare sudah diset di .env.local</p>
                    </td>
                  </tr>
                )}

                {!r2Loading && !r2Error && buckets.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                      Belum ada bucket yang ditemukan
                    </td>
                  </tr>
                )}

                {!r2Loading && !r2Error && buckets.map((bucket: any) => (
                  <tr 
                    key={bucket.name} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500">
                          <Database className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-slate-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                          {bucket.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(bucket.usage?.objectCount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {formatBytes(bucket.usage?.payloadSize || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
