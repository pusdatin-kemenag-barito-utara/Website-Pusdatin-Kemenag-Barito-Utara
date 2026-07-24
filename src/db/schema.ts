import {
  pgSchema,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  varchar,
  boolean,
  numeric,
  index,
} from "drizzle-orm/pg-core";

export const pusdatin = pgSchema("kemenag_pusdatin");
export const ptsp = pgSchema("kemenag_ptsp");

export const ptspServices = ptsp.table("ptsp_services", {
  id: integer("id").primaryKey(),
  category: text("category").notNull().default("public"),
  isActive: boolean("is_active").notNull().default(true),
});

export const ptspServiceItems = ptsp.table("ptsp_service_items", {
  id: integer("id").primaryKey(),
  serviceId: integer("service_id").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const profiles = pusdatin.table("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash"),
  role: varchar("role", { length: 50 }).notNull().default("admin"),
  userType: varchar("user_type", { length: 50 }).notNull().default("internal_admin"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  avatar: text("avatar"),
  phone: text("phone"),
  address: text("address"),
  isVerified: boolean("is_verified").default(true),
  permissions: jsonb("permissions"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const satelliteApps = pusdatin.table("satellite_apps", {
  id: varchar("id", { length: 50 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 500 }),
  url: varchar("url", { length: 500 }),
  schemaName: varchar("schema_name", { length: 100 }).notNull(),
  schemaUrl: varchar("schema_url", { length: 500 }),
  status: varchar("status", { length: 20 }).notNull().default("online"),
  lastHealthCheck: timestamp("last_health_check"),
  availableFeatures: jsonb("available_features"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appPermissions = pusdatin.table("app_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  appId: varchar("app_id", { length: 50 }).notNull().references(() => satelliteApps.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull().default("none"),
  features: jsonb("features"),
});

export const auditLogs = pusdatin.table("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: varchar("action", { length: 20 }).notNull(),
  target: varchar("target", { length: 255 }).notNull(),
  targetSchema: varchar("target_schema", { length: 100 }),
  performedBy: varchar("performed_by", { length: 255 }).notNull(),
  beforeState: jsonb("before_state"),
  afterState: jsonb("after_state"),
  ip: varchar("ip", { length: 50 }),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
}, (table) => ({
  timestampIdx: index("audit_logs_timestamp_idx").on(table.timestamp),
  targetSchemaIdx: index("audit_logs_target_schema_idx").on(table.targetSchema),
}));

export const systemMetrics = pusdatin.table("system_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  cpu: integer("cpu").notNull().default(0),
  ram: integer("ram").notNull().default(0),
  storage: integer("storage").notNull().default(0),
  uptime: varchar("uptime", { length: 100 }),
  cpuCores: integer("cpu_cores").notNull().default(0),
  ramUsedGb: numeric("ram_used_gb", { precision: 8, scale: 2 }).default("0"),
  ramTotalGb: numeric("ram_total_gb", { precision: 8, scale: 2 }).default("0"),
  storageUsedGb: numeric("storage_used_gb", { precision: 10, scale: 2 }).default("0"),
  storageTotalGb: numeric("storage_total_gb", { precision: 10, scale: 2 }).default("0"),
  recordedAt: timestamp("recorded_at").defaultNow().notNull(),
}, (table) => ({
  recordedAtIdx: index("system_metrics_recorded_at_idx").on(table.recordedAt),
}));

export const profilesAdmin = pusdatin.table("profiles_admin", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const profilesPegawai = pusdatin.table("profiles_pegawai", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  nip: varchar("nip", { length: 50 }),
  jabatan: varchar("jabatan", { length: 100 }),
  pangkatGolongan: varchar("pangkat_golongan", { length: 50 }),
  unitKerja: varchar("unit_kerja", { length: 255 }),
  tipePejabat: varchar("tipe_pejabat", { length: 50 }),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const profilesPemohon = pusdatin.table("profiles_pemohon", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  fullName: varchar("full_name", { length: 255 }),
  nik: varchar("nik", { length: 50 }).unique(),
  noHp: varchar("no_hp", { length: 20 }),
  alamat: text("alamat"),
  pekerjaan: varchar("pekerjaan", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const trustedDevices = pusdatin.table("trusted_devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  deviceName: varchar("device_name", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 50 }),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("trusted_devices_user_id_idx").on(table.userId),
  expiresAtIdx: index("trusted_devices_expires_at_idx").on(table.expiresAt),
}));

// Alias for backward compatibility
export { profiles as users };


