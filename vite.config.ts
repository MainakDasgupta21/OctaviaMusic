import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Some Windows / networked-filesystem setups don't deliver native FS
    // events reliably, so Vite's watcher can miss edits and keep serving a
    // stale module from its transform cache. Polling guarantees changes are
    // always detected and HMR fires.
    watch: {
      usePolling: true,
      interval: 200,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Hoist big shared dependencies so the page-level chunks stay tiny and
    // the browser can cache vendors independently of our code changes.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react-player") || id.includes("hls.js") || id.includes("dashjs")) {
            return "vendor-player";
          }
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("@dnd-kit")) return "vendor-dnd";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("cmdk")) return "vendor-cmdk";
          if (id.includes("sonner")) return "vendor-sonner";
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("lenis")) return "vendor-lenis";
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("scheduler")) {
            return "vendor-react";
          }
          return "vendor";
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
}));
