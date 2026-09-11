// Public (PUBLIC_*) variables only. Server-side secrets live
// exclusively in backend/.env / Infisical and are never exposed to the frontend bundle.

declare global {
  interface Window {
    __PUBLIC_ENV__?: Record<string, string>;
  }
}

function resolvePublicEnv(
  keys: string[],
  importMetaVal: string | undefined,
  fallback: string = ""
): string {
  // 1. Server-side Node process.env (injected dynamically by Infisical during runtime)
  if (typeof process !== "undefined" && process.env) {
    for (const key of keys) {
      if (process.env[key]) return process.env[key]!;
    }
  }

  // 2. Client-side window.__PUBLIC_ENV__ (injected into HTML by SSR in BaseLayout.astro)
  if (typeof window !== "undefined" && window.__PUBLIC_ENV__) {
    for (const key of keys) {
      if (window.__PUBLIC_ENV__[key]) return window.__PUBLIC_ENV__[key];
    }
  }

  // 3. Build-time Vite / Astro inlined import.meta.env
  if (importMetaVal) {
    return importMetaVal;
  }

  return fallback;
}

export const env = {
  siteUrl: resolvePublicEnv(
    ["PUBLIC_SITE_URL", "SITE_URL"],
    import.meta.env.PUBLIC_SITE_URL,
    ""
  ),
  supabaseUrl: resolvePublicEnv(
    ["PUBLIC_SUPABASE_URL", "SUPABASE_URL"],
    import.meta.env.PUBLIC_SUPABASE_URL,
    ""
  ),
  supabaseAnonKey: resolvePublicEnv(
    [
      "PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_ANON_KEY",
      "PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
    ],
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY ||
      import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ""
  ),
  supabasePublishableKey: resolvePublicEnv(
    [
      "PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
      "PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_ANON_KEY",
    ],
    import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    ""
  ),
  turnstileSiteKey: resolvePublicEnv(
    ["PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SITE_KEY"],
    import.meta.env.PUBLIC_TURNSTILE_SITE_KEY,
    ""
  ),
  gaMeasurementId: resolvePublicEnv(
    ["PUBLIC_GA_MEASUREMENT_ID", "GA_MEASUREMENT_ID"],
    import.meta.env.PUBLIC_GA_MEASUREMENT_ID,
    ""
  ),
  gtmId: resolvePublicEnv(
    ["PUBLIC_GTM_ID", "GTM_ID"],
    import.meta.env.PUBLIC_GTM_ID,
    ""
  ),
  cfBeaconToken: resolvePublicEnv(
    ["PUBLIC_CF_BEACON_TOKEN", "CF_BEACON_TOKEN"],
    import.meta.env.PUBLIC_CF_BEACON_TOKEN,
    ""
  ),
};
