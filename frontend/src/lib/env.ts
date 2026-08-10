// removed dynamic readEnv function as Next.js requires literal process.env access for client side variables
export const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || "",
  databaseUrl: process.env.DATABASE_URL || "",
  directUrl: process.env.DIRECT_URL || "",
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL || "",
  pusdatinSchema: process.env.NEXT_PUBLIC_PUSDATIN_SCHEMA || "",
  redisUrl: process.env.REDIS_URL || "",
  trustedDeviceSecret: process.env.TRUSTED_DEVICE_SECRET || process.env.TURNSTILE_SECRET_KEY || "",
};

if (!env.supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is required");
}
