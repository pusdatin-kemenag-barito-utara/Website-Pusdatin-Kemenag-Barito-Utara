// Public (PUBLIC_*) variables only. Server-side secrets live
// exclusively in backend/.env and are never exposed to the frontend bundle.
export const env = {
  siteUrl:
    (typeof process !== "undefined" && process.env?.PUBLIC_SITE_URL) ||
    import.meta.env.PUBLIC_SITE_URL ||
    "https://pusdatin.kemenag-baritoutara.com",
  supabaseUrl:
    (typeof process !== "undefined" && (process.env?.PUBLIC_SUPABASE_URL || process.env?.SUPABASE_URL)) ||
    import.meta.env.PUBLIC_SUPABASE_URL ||
    "https://db.kemenag-baritoutara.com",
  supabaseAnonKey:
    (typeof process !== "undefined" && (process.env?.PUBLIC_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY)) ||
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
    "",
  supabasePublishableKey:
    (typeof process !== "undefined" && (process.env?.PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env?.PUBLIC_SUPABASE_ANON_KEY || process.env?.SUPABASE_PUBLISHABLE_KEY || process.env?.SUPABASE_ANON_KEY)) ||
    import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
    "",
  turnstileSiteKey:
    (typeof process !== "undefined" && process.env?.PUBLIC_TURNSTILE_SITE_KEY) ||
    import.meta.env.PUBLIC_TURNSTILE_SITE_KEY ||
    "",
  gaMeasurementId:
    (typeof process !== "undefined" && process.env?.PUBLIC_GA_MEASUREMENT_ID) ||
    import.meta.env.PUBLIC_GA_MEASUREMENT_ID ||
    "",
  gtmId:
    (typeof process !== "undefined" && process.env?.PUBLIC_GTM_ID) ||
    import.meta.env.PUBLIC_GTM_ID ||
    "",
  cfBeaconToken:
    (typeof process !== "undefined" && process.env?.PUBLIC_CF_BEACON_TOKEN) ||
    import.meta.env.PUBLIC_CF_BEACON_TOKEN ||
    "",
};

if (!env.supabaseUrl && typeof window !== "undefined") {
  throw new Error("PUBLIC_SUPABASE_URL is required");
}
