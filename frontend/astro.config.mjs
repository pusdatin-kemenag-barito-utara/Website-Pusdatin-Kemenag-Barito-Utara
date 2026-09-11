import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";
import AstroPWA from "@vite-pwa/astro";

const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8080";

export default defineConfig({
  output: "server",
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
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
        navigateFallback: null,
        globPatterns: ["**/*.{js,css,ico,png,svg,woff2,webmanifest}"],
        navigateFallbackDenylist: [/^\/api/, /^\/uploads/, /^\/login/],
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
    port: 3000,
    proxy: {
      "/api": backendUrl,
      "/uploads": backendUrl,
    },
  },
});
