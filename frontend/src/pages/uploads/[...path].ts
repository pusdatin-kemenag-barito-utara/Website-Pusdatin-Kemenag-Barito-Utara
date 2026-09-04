import type { APIRoute } from "astro";

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || "https://files.kemenag-baritoutara.com/pusdatin";

export const GET: APIRoute = async ({ params, url }) => {
  const path = Array.isArray(params.path) ? params.path.join("/") : params.path || "";
  const cleanBase = R2_PUBLIC_URL.replace(/\/+$/, "");
  const target = `${cleanBase}/${path}${url.search}`;

  return new Response(null, {
    status: 301,
    headers: {
      Location: target,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};

export const ALL: APIRoute = GET;
