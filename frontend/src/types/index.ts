export interface User {
  id: string;
  name: string;
  email: string;
  role: "super_admin" | "admin" | "sub_admin" | "pegawai" | "user" | "pemohon";
  userType: "internal_admin" | "internal_pegawai" | "eksternal_masyarakat";
  status: "active" | "inactive";
  avatar?: string;
  nip?: string;
  jabatan?: string;
  pangkatGolongan?: string | null;
  unitKerja?: string;
  noHp?: string | null;
  alamat?: string | null;
  nik?: string | null;
  pekerjaan?: string | null;
  createdAt: string;
  updatedAt: string;
  appPermissions: AppPermission[];
}

export interface AppPermission {
  appId: string;
  appName: string;
  role: "operator" | "viewer" | "none";
  features?: string[];
}

export interface SateliteApp {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  url: string | null;
  status: "online" | "maintenance" | "degraded";
  schema: string;
  schemaName: string;
  schemaUrl?: string | null;
  lastHealthCheck: Date | null;
  sortOrder: number;
  availableFeatures?: { id: string, label: string }[];
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  target: string;
  targetSchema: string;
  performedBy: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
}

export interface SystemHealth {
  cpu: number;
  ram: number;
  storage: number;
  uptime: string;
  cpuCores?: number;
  ramUsedGb?: string | number;
  ramTotalGb?: string | number;
  storageUsedGb?: string | number;
  storageTotalGb?: string | number;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalApps: number;
  onlineApps: number;
  totalLogs: number;
  todayLogs: number;
}

export interface ReportData {
  appName: string;
  count: number;
  color: string;
}

export interface ActivityData {
  date: string;
  count: number;
}
