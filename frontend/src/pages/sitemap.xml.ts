import type { APIRoute } from "astro";
import { env } from "@/lib/env";

const baseUrl = env.siteUrl || "https://pusdatin.kemenag-baritoutara.com";
const today = new Date().toISOString();

export const GET: APIRoute = async () => {
  const urls = [
    { loc: `${baseUrl}/`, lastmod: today, freq: "daily", prio: "1.0" },
    { loc: `${baseUrl}/profil`, lastmod: today, freq: "monthly", prio: "0.8" },
    { loc: `${baseUrl}/layanan`, lastmod: today, freq: "weekly", prio: "0.9" },
    { loc: `${baseUrl}/pengumuman`, lastmod: today, freq: "daily", prio: "0.8" },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.prio}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
