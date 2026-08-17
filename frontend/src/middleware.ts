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
  let hasAal2 = false;

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
      } else if (payload?.aal === "aal2") {
        hasAal2 = true;
      }
    } catch (e) {
      console.error("[MIDDLEWARE] Failed to parse JWT:", e);
    }
  }

  if (!hasSupabaseSession && !isPublic && pathname !== "/") {
    return context.redirect("/login", 307);
  }

  if (hasSupabaseSession && (hasAal2 || !import.meta.env.PROD) && (pathname === "/login" || pathname === "/")) {
    return context.redirect("/dashboard/apps", 307);
  }

  return next();
});
