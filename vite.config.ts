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
      filename: "manifest.json",
      includeAssets: ["icon.svg", "mask-icon.svg", "apple-touch-icon.svg"],
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
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "mask-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
          {
            src: "apple-touch-icon.svg",
            sizes: "180x180",
            type: "image/svg+xml",
            purpose: "any",
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
