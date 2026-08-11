import type { APIRoute } from "astro";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8080";

export const GET: APIRoute = async ({ request, params, url }) => {
  const path = Array.isArray(params.path) ? params.path.join("/") : params.path || "";
  const target = new URL(`${path ? `/uploads/${path}` : "/uploads"}${url.search}`, BACKEND_URL);

  const headers = new Headers();
  if (request.headers.get("accept")) {
    headers.set("accept", request.headers.get("accept")!);
  }

  try {
    const res = await fetch(target.toString(), {
      method: "GET",
      headers,
    });

    if (res.status === 404) {
      return new Response("Asset not found", {
        status: 404,
        headers: {
          "cache-control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    const responseHeaders = new Headers();
    const contentType = res.headers.get("content-type");
    if (contentType) {
      responseHeaders.set("content-type", contentType);
    }
    const cacheControl = res.headers.get("cache-control");
    if (cacheControl) {
      responseHeaders.set("cache-control", cacheControl);
    } else {
      responseHeaders.set("cache-control", "public, max-age=86400, stale-while-revalidate=604800");
    }

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error(`[Uploads Proxy Error] Failed to fetch ${target.toString()}:`, err);
    return new Response("Upload asset unavailable", {
      status: 502,
      headers: {
        "cache-control": "no-store, no-cache, must-revalidate",
      },
    });
  }
};

export const ALL: APIRoute = GET;
