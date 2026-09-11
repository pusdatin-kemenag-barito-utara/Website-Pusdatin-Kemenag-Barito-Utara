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
    import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || "",
  gaMeasurementId:
    import.meta.env.PUBLIC_GA_MEASUREMENT_ID || "",
  gtmId:
    import.meta.env.PUBLIC_GTM_ID || "",
  cfBeaconToken:
    import.meta.env.PUBLIC_CF_BEACON_TOKEN || "",
};

if (!env.supabaseUrl) {
  throw new Error("PUBLIC_SUPABASE_URL is required");
}
