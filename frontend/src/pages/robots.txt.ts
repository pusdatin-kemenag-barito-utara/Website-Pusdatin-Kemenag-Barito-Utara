import type { APIRoute } from "astro";
import { env } from "@/lib/env";

const baseUrl = env.siteUrl || "https://pusdatin.kemenag-baritoutara.com";

export const GET: APIRoute = async () => {
  const robots = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /dashboard/
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;

  return new Response(robots, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
