import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    // Vitest 4's default `forks` pool doesn't reliably spawn child processes
    // on Windows in this environment — the workers time out before they can
    // respond. Threads avoids that by running in-process workers.
    pool: 'threads',
    minWorkers: 1,
    maxWorkers: 1,
  },
});
