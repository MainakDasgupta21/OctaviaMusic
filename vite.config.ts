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
    // Keep production bundling on Vite/Rollup defaults for runtime safety.
    // A custom manualChunks strategy caused a startup crash on Render
    // (`Cannot read properties of undefined`) due fragile cross-chunk init.
    chunkSizeWarningLimit: 700,
  },
}));
