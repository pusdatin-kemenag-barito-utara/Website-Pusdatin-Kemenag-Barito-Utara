"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useReportData, useActivityData } from "@/hooks/use-reports";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { FileText, Activity, BarChart3 } from "lucide-react";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function ReportsPage() {
  const { data: reportData, isLoading: reportLoading } = useReportData();
  const { data: activity } = useActivityData(14);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Laporan & Analitik</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Data agregasi laporan dari seluruh aplikasi satelit
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Distribusi per Aplikasi</h3>
            </div>
          </CardHeader>
          <CardBody>
            {reportLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : reportData ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                    <XAxis
                      dataKey="appName"
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-72 items-center justify-center text-sm text-slate-500">
                Belum ada data laporan
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Aktivitas (14 Hari)</h3>
            </div>
          </CardHeader>
          <CardBody>
            {activity ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activity}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ fill: "#10b981", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 animate-pulse rounded-lg bg-slate-100" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Komposisi Data</h3>
            </div>
          </CardHeader>
          <CardBody>
            {reportData ? (
              <div className="relative h-72 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData}
                      dataKey="count"
                      nameKey="appName"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      innerRadius={75}
                      paddingAngle={3}
                      stroke="none"
                      labelLine={false}
                      label={({
                        cx,
                        cy,
                        midAngle,
                        innerRadius,
                        outerRadius,
                        percent,
                      }) => {
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const RADIAN = Math.PI / 180;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);

                        return percent > 0.05 ? (
                          <text
                            x={x}
                            y={y}
                            fill="white"
                            textAnchor="middle"
                            dominantBaseline="central"
                            className="text-xs font-bold"
                          >
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        ) : null;
                      }}
                    >
                      {reportData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        fontSize: "12px",
                        fontWeight: 500,
                      }}
                      itemStyle={{ color: "#334155" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-slate-800 dark:text-slate-200">
                    {reportData.reduce((acc, curr) => acc + curr.count, 0)}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider">
                    Total Data
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex h-72 w-full items-center justify-center text-sm text-slate-500">
                Belum ada data
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              <h3 className="font-semibold text-slate-900 dark:text-white">Ringkasan</h3>
            </div>
          </CardHeader>
          <CardBody>
            {reportData ? (
              <div className="space-y-3">
                {reportData.map((item, i) => (
                  <div
                    key={item.appName}
                    className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-900/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {item.appName}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {item.count}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3">
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Total</span>
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {reportData.reduce((acc, curr) => acc + curr.count, 0)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-slate-500">
                Belum ada data
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
