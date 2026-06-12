import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { compression } from "vite-plugin-compression2";

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
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    // Emit pre-compressed `.gz` and `.br` siblings for production assets.
    // Hosts with `gzip_static` / `brotli_static` (nginx, caddy, vercel, etc.)
    // can serve these without any runtime CPU cost. Only files >1 KB get a
    // compressed sibling; smaller files don't benefit and waste an inode.
    // (Using vite-plugin-compression2 — the older `vite-plugin-compression`
    // has a Windows-path bug that writes siblings under `dist/C:/...`.)
    mode === "production" &&
      compression({
        algorithm: "gzip",
        threshold: 1024,
        deleteOriginalAssets: false,
      }),
    mode === "production" &&
      compression({
        algorithm: "brotliCompress",
        threshold: 1024,
        deleteOriginalAssets: false,
      }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Hoist big shared dependencies so the page-level chunks stay tiny and
    // the browser can cache vendors independently of our code changes.
    // Note: we intentionally do NOT force-split react-player/hls.js/dash.js.
    // A dedicated vendor-player chunk caused a production runtime init error
    // on Render (`Cannot access ... before initialization`) for the app shell.
    // Letting Rollup place those modules with default behavior is stable.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;
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
