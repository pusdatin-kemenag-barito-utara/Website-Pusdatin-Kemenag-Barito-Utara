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
  // 1. Client-side window.__PUBLIC_ENV__ (prioritas utama saat running di browser)
  if (typeof window !== "undefined") {
    if (window.__PUBLIC_ENV__) {
      for (const key of keys) {
        const val = window.__PUBLIC_ENV__[key];
        if (val && typeof val === "string" && val.trim() !== "") {
          return val.trim();
        }
      }
    }
  }

  // 2. Server-side Node process.env (injected dynamically by Infisical during runtime)
  if (typeof process !== "undefined" && process.env) {
    for (const key of keys) {
      const val = process.env[key];
      if (val && typeof val === "string" && val.trim() !== "") {
        return val.trim();
      }
    }
  }

  // 3. Build-time Vite / Astro inlined import.meta.env
  if (importMetaVal && typeof importMetaVal === "string" && importMetaVal.trim() !== "") {
    return importMetaVal.trim();
  }

  return fallback;
}

export const env = {
  get siteUrl(): string {
    return resolvePublicEnv(
      ["PUBLIC_SITE_URL", "SITE_URL"],
      import.meta.env.PUBLIC_SITE_URL,
      ""
    );
  },
  get pocketbaseUrl(): string {
    return resolvePublicEnv(
      ["PUBLIC_POCKETBASE_URL", "POCKETBASE_URL"],
      import.meta.env.PUBLIC_POCKETBASE_URL,
      ""
    );
  },
  get turnstileSiteKey(): string {
    return resolvePublicEnv(
      ["PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SITE_KEY"],
      import.meta.env.PUBLIC_TURNSTILE_SITE_KEY,
      ""
    );
  },
  get gaMeasurementId(): string {
    return resolvePublicEnv(
      ["PUBLIC_GA_MEASUREMENT_ID", "GA_MEASUREMENT_ID"],
      import.meta.env.PUBLIC_GA_MEASUREMENT_ID,
      ""
    );
  },
  get gtmId(): string {
    return resolvePublicEnv(
      ["PUBLIC_GTM_ID", "GTM_ID"],
      import.meta.env.PUBLIC_GTM_ID,
      ""
    );
  },
  get cfBeaconToken(): string {
    return resolvePublicEnv(
      ["PUBLIC_CF_BEACON_TOKEN", "CF_BEACON_TOKEN"],
      import.meta.env.PUBLIC_CF_BEACON_TOKEN,
      ""
    );
  },
};
