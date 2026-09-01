import { defineMiddleware } from "astro:middleware";

const publicPaths = ["/login", "/maintenance", "/profil", "/layanan", "/pengumuman", "/404"];

function parseAccessToken(combinedCookie: string): { exp?: number; aal?: string } | null {
  if (!combinedCookie) return null;
  let decoded = combinedCookie;
  try {
    decoded = decodeURIComponent(combinedCookie);
  } catch {
    // keep raw value
  }

  let token = "";
  try {
    if (decoded.startsWith("base64-")) {
      const jsonStr = Buffer.from(decoded.replace("base64-", ""), "base64").toString("utf8");
      const json = JSON.parse(jsonStr);
      token = json.access_token || (Array.isArray(json) ? json[0] : "");
    } else if (decoded.startsWith("{") || decoded.startsWith("[")) {
      const json = JSON.parse(decoded);
      token = json.access_token || (Array.isArray(json) ? json[0] : "");
    } else {
      token = decoded;
    }
  } catch {
    token = decoded;
  }

  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return null;
    const payloadStr = parts[1];
    const payload = JSON.parse(
      Buffer.from(payloadStr.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    );
    return payload;
  } catch {
    return null;
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (
    pathname.startsWith("/branding") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/api") ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname === "/favicon.ico" ||
    pathname.includes(".")
  ) {
    return next();
  }

  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path),
  );

  // Jika halaman publik murni (profil, pengumuman, layanan, maintenance), langsung teruskan
  if (isPublic && pathname !== "/login") {
    return next();
  }

  let hasSupabaseSession = false;

  let cookieHeader = "";
  try {
    cookieHeader = context.request?.headers?.get("cookie") || "";
  } catch {
    cookieHeader = "";
  }
  const authCookies = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      const name = eq === -1 ? part : part.slice(0, eq);
      const value = eq === -1 ? "" : part.slice(eq + 1);
      return { name, value };
    })
    .filter((c) => c.name.startsWith("sb-pusdatin-auth-token"));

  if (authCookies.length > 0) {
    hasSupabaseSession = true;
    try {
      authCookies.sort((a, b) => a.name.localeCompare(b.name));
      const combinedCookie = authCookies.map((c) => c.value).join("");
      const payload = parseAccessToken(combinedCookie);

      if (payload?.exp && payload.exp * 1000 < Date.now()) {
        hasSupabaseSession = false;
      }
    } catch (e) {
      console.error("[MIDDLEWARE] Failed to parse JWT:", e);
    }
  }

  const start = performance.now();

  if (!hasSupabaseSession && !isPublic && pathname !== "/") {
    if (import.meta.env.DEV) {
      console.log(
        `\x1b[90m[${new Date().toTimeString().split(" ")[0]}]\x1b[0m 🟡 \x1b[33m307 REDIR\x1b[0m | \x1b[36m${context.request.method}\x1b[0m \x1b[1m${pathname}\x1b[0m -> /login (Unauthenticated)`
      );
    }
    return context.redirect("/login", 307);
  }

  const response = await next();
  const duration = Math.round(performance.now() - start);

  // Enterprise Development Terminal Logger
  if (import.meta.env.DEV && !pathname.startsWith("/_astro")) {
    const status = response.status;
    const statusIcon = status >= 200 && status < 300 ? "🟢" : status >= 300 && status < 400 ? "🟡" : "🔴";
    const durationColor = duration < 100 ? "\x1b[32m" : duration < 500 ? "\x1b[33m" : "\x1b[31m";
    console.log(
      `\x1b[90m[${new Date().toTimeString().split(" ")[0]}]\x1b[0m ${statusIcon} \x1b[1m${status}\x1b[0m | \x1b[36m%-4s\x1b[0m \x1b[1m%-24s\x1b[0m | ${durationColor}%4dms\x1b[0m | %s`,
      context.request.method,
      pathname,
      duration,
      hasSupabaseSession ? "\x1b[32mSuperAdmin\x1b[0m" : "\x1b[90mPublic\x1b[0m"
    );
  }

  // Enterprise HTTP/3 & QUIC Protocol Negotiation
  response.headers.set("Alt-Svc", 'h3=":443"; ma=86400, h3-29=":443"; ma=86400, h3-27=":443"; ma=86400');

  // HTTP/2 & HTTP/3 Early Preload Link Header for 103 Early Hints
  response.headers.set("Link", '</branding/pusdatin.png>; rel=preload; as=image; fetchpriority=high');

  // Enterprise Security & Network Performance Headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  response.headers.set("Timing-Allow-Origin", "*");

  // Cloudflare Edge CDN Caching & Revalidation Policies
  if (isPublic || pathname === "/") {
    response.headers.set("Cloudflare-CDN-Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    response.headers.set("CDN-Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
    response.headers.set("Vary", "Accept-Encoding, Accept, Cookie");
  } else {
    response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");
    response.headers.set("Cloudflare-CDN-Cache-Control", "private, no-store");
  }

  return response;
});

