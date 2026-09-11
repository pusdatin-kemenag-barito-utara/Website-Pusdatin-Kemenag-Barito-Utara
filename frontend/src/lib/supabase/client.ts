import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";

let cachedClient: SupabaseClient | null = null;

export function createBrowserSupabaseClient(): SupabaseClient | null {
  if (cachedClient) {
    return cachedClient;
  }

  const url = env.supabaseUrl;
  const key = env.supabasePublishableKey || env.supabaseAnonKey;

  if (!url || !key) {
    console.warn("[Supabase Client] URL atau Key Supabase belum tersedia di environment.");
    return null;
  }

  cachedClient = createBrowserClient(url, key, {
    cookieOptions: {
      name: "sb-pusdatin-auth-token",
    },
  });

  return cachedClient;
}
