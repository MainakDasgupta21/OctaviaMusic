import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// =============================================================================
// Apply persisted theme + reduce-motion BEFORE React mounts so we never flash
// the wrong palette. Mirrors the keys SettingsContext writes.
// =============================================================================
const SETTINGS_KEY = 'octavia.settings.v1';
const VALID_THEMES = new Set(['dark', 'oled', 'light', 'hicontrast']);

try {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (raw) {
    const s = JSON.parse(raw);
    if (s && VALID_THEMES.has(s.theme)) {
      if (s.theme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.dataset.theme = s.theme;
      }
    }
    if (s?.reduceMotion === true) {
      document.documentElement.dataset.reduceMotion = 'true';
    }
  }
} catch {
  /* noop */
}

// =============================================================================
// Preconnect to the backend API origin if it lives on a different host
// (e.g. a deployed `api.example.com`). For same-origin / relative configs
// (`/api`), this is a no-op. Done synchronously here so the handshake
// overlaps with the rest of bootstrap.
// =============================================================================
try {
  const apiBase = import.meta.env?.VITE_API_BASE;
  if (apiBase) {
    const url = new URL(apiBase, window.location.href);
    if (url.origin && url.origin !== window.location.origin) {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = url.origin;
      link.crossOrigin = '';
      document.head.appendChild(link);
    }
  }
} catch {
  /* malformed VITE_API_BASE; ignore */
}

// Lenis smooth-scroll is now bootstrapped from `useLenisScroll`, which
// mounts inside `MainLayout` once `#main-content` exists. Initialising
// here would attach Lenis to `window`, but the real scrollport is the
// `<main>` element — see `src/hooks/use-lenis-scroll.js`.

createRoot(document.getElementById('root')).render(<App />);
