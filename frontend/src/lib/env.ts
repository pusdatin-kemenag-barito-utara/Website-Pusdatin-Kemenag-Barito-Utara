// Public (PUBLIC_*) variables only. Server-side secrets live
// exclusively in backend/.env and are never exposed to the frontend bundle.
export const env = {
  siteUrl: import.meta.env.PUBLIC_SITE_URL || "",
  supabaseUrl: import.meta.env.PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: import.meta.env.PUBLIC_SUPABASE_ANON_KEY || "",
  supabasePublishableKey:
    import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY || "",
  turnstileSiteKey:
    import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAADR1O_LSp1lgc3km",
};

if (!env.supabaseUrl) {
  throw new Error("PUBLIC_SUPABASE_URL is required");
}
