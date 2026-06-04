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
// Lenis smooth scroll. Off when user prefers reduced motion.
// =============================================================================
const prefersReduced =
  document.documentElement.dataset.reduceMotion === 'true' ||
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

if (!prefersReduced) {
  import('lenis')
    .then(({ default: Lenis }) => {
      const lenis = new Lenis({
        duration: 0.9,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        smoothTouch: false,
      });
      const raf = (time) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
      window.__lenis = lenis;
    })
    .catch(() => {
      /* lenis optional; native scroll is fine */
    });
}

createRoot(document.getElementById('root')).render(<App />);
