import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  base: "/chatbot-aguilar-cosmetiqueras-frontend/",
  build: {
    outDir: "dist",
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      filename: "manifest.webmanifest",
      includeAssets: ["pwa-72x72.png", "pwa-192x192.png", "pwa-512x512.png", "mask-icon.svg"],
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: "AgentDesk",
        short_name: "AgentDesk",
        description: "Dashboard de conversaciones para agentes de soporte y ventas por WhatsApp.",
        lang: "es-MX",
        start_url: "/chatbot-aguilar-cosmetiqueras-frontend/",
        scope: "/chatbot-aguilar-cosmetiqueras-frontend/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0f172a",
        theme_color: "#0f172a",
        icons: [
          {
            src: "pwa-72x72.png",
            sizes: "72x72",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
