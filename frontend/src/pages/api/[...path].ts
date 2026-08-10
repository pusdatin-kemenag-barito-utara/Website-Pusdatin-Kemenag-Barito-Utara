import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8080";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export const ALL: APIRoute = async ({ request, params, url }) => {
  const path = Array.isArray(params.path) ? params.path.join("/") : params.path || "";
  const target = new URL(`${path ? `/api/${path}` : "/api"}${url.search}`, BACKEND_URL);

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) return;
    if (lower === "host" || lower === "content-length") return;
    headers.set(key, value);
  });

  const body = ["GET", "HEAD"].includes(request.method) ? undefined : request.body;

  let res: Response;
  try {
    res = await fetch(target.toString(), {
      method: request.method,
      headers,
      body,
      duplex: "half",
      redirect: "manual",
    } as RequestInit);
  } catch (err) {
    console.error("[API PASSTHROUGH] Backend unreachable:", target.toString(), err);
    return new Response(JSON.stringify({ error: "Backend tidak dapat dijangkau" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  const responseHeaders = new Headers(res.headers);
  ["connection", "keep-alive", "transfer-encoding", "upgrade"].forEach((h) =>
    responseHeaders.delete(h),
  );

  const setCookies = typeof (res.headers as any).getSetCookie === "function"
    ? (res.headers as any).getSetCookie()
    : res.headers.get("set-cookie")?.split(/,\s*(?=[A-Za-z0-9_-]+=)/) || [];

  if (setCookies.length > 0) {
    responseHeaders.delete("set-cookie");
    setCookies.forEach((cookie: string) => responseHeaders.append("set-cookie", cookie));
  }

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  });
};
