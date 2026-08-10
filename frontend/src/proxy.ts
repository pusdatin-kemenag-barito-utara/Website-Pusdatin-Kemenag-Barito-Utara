import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/maintenance", "/profil", "/layanan", "/pengumuman"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/branding") ||
    pathname.startsWith("/uploads") ||
    pathname.startsWith("/api") ||
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname === "/manifest.webmanifest"
  ) {
    return NextResponse.next();
  }

  let hasSupabaseSession = false;
  let hasAal2 = false;
  
  const authCookies = request.cookies.getAll().filter(c =>
    c.name.startsWith("sb-pusdatin-auth-token")
  );

  if (authCookies.length > 0) {
    hasSupabaseSession = true;
    try {
      // Parse the access token to check AAL level
      authCookies.sort((a, b) => a.name.localeCompare(b.name));
      const combinedCookie = authCookies.map(c => c.value).join('');
      
      let decoded = combinedCookie;
      try { decoded = decodeURIComponent(combinedCookie); } catch(e) {}
      
      let accessToken = "";
      if (decoded.startsWith("base64-")) {
        const jsonStr = atob(decoded.replace("base64-", ""));
        const json = JSON.parse(jsonStr);
        accessToken = json.access_token || (Array.isArray(json) ? json[0] : "");
      } else {
        const json = JSON.parse(decoded);
        accessToken = json.access_token || (Array.isArray(json) ? json[0] : "");
      }

      if (accessToken) {
        const payloadStr = accessToken.split('.')[1];
        const payload = JSON.parse(atob(payloadStr.replace(/-/g, '+').replace(/_/g, '/')));
        
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          hasSupabaseSession = false;
        } else if (payload.aal === 'aal2') {
          hasAal2 = true;
        }
      }
    } catch (e) {
      console.error("[PROXY] Failed to parse JWT:", e);
    }
  }

  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path),
  );

  if (!hasSupabaseSession && !isPublic && pathname !== "/") {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSupabaseSession && hasAal2 && (pathname === "/login" || pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard/apps", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
