export interface User {
  id: string;
  name: string;
  email: string;
  role: "super_admin";
  userType?: string;
  status: "active" | "inactive";
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
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
  totalApps: number;
  onlineApps: number;
  totalAnnouncements: number;
  totalLogs: number;
  todayLogs: number;
  superAdminCount: number;
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

export interface Announcement {
  id: string;
  title: string;
  tag: string;
  description: string;
  isImportant: boolean;
  isActive: boolean;
  orderIndex: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
