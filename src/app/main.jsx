import { createRoot } from 'react-dom/client';
import App from './App';
import '../index.css';

const SETTINGS_KEY = 'octavia.settings.v1';
const VALID_THEMES = new Set(['dark', 'oled', 'light', 'hicontrast']);

try {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (raw) {
    const settings = JSON.parse(raw);
    if (settings && VALID_THEMES.has(settings.theme)) {
      if (settings.theme === 'dark') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.dataset.theme = settings.theme;
      }
    }
    if (settings?.reduceMotion === true) {
      document.documentElement.dataset.reduceMotion = 'true';
    }
  }
} catch {
  /* noop */
}

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

createRoot(document.getElementById('root')).render(<App />);
