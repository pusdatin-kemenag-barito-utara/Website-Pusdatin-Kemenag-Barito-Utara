import type { APIRoute } from "astro";

const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL || "").replace(/\/+$/, "");

export const GET: APIRoute = async ({ params, url }) => {
  if (!R2_PUBLIC_URL) {
    return new Response("Storage URL not configured", { status: 500 });
  }
  const path = Array.isArray(params.path) ? params.path.join("/") : params.path || "";
  const target = `${R2_PUBLIC_URL}/${path}${url.search}`;

  return new Response(null, {
    status: 301,
    headers: {
      Location: target,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};

export const ALL: APIRoute = GET;
