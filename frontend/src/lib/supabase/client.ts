import { createBrowserClient } from "@supabase/ssr";
import { env } from "../env";

export function createBrowserSupabaseClient() {
  const url = env.supabaseUrl;
  const key = env.supabasePublishableKey;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL tidak tersedia");
  if (!key) throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY tidak tersedia");

  return createBrowserClient(url, key, {
    cookieOptions: {
      name: "sb-pusdatin-auth-token",
    },
  });
}
