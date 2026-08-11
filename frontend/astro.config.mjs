import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";
import AstroPWA from "@vite-pwa/astro";

const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";

export default defineConfig({
  output: "server",
  security: {
    checkOrigin: false,
  },
  adapter: node({ mode: "standalone" }),
  site: process.env.PUBLIC_SITE_URL || undefined,
  integrations: [
    react(),
    AstroPWA({
      registerType: "autoUpdate",
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webmanifest}"],
        navigateFallbackDenylist: [/^\/api/, /^\/uploads/],
      },
    }),
  ],
  vite: {
    envDir: "../",
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["recharts", "react-router-dom", "@tanstack/react-query", "lucide-react", "date-fns"],
    },
  },
  server: {
    proxy: {
      "/api": backendUrl,
      "/uploads": backendUrl,
    },
  },
});
