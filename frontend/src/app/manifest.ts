import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PUSDATIN Kemenag Kabupaten Barito Utara",
    short_name: "PUSDATIN",
    description: "Portal Pusat Data dan Teknologi Informasi — manajemen data master terpadu dan autentikasi terpusat Kementerian Agama Kabupaten Barito Utara.",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#006838",
    icons: [
      {
        src: "/branding/pusdatin.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/branding/pusdatin.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
