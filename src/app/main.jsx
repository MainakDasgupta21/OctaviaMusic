import { createRoot } from 'react-dom/client';
import App from './App';
import '../index.css';
import { getAccentPreset } from '@/lib/accent-presets';
import { lockPalette } from '@/hooks/use-color-extraction';

const SETTINGS_KEY = 'octavia.settings.v1';
const APPEARANCE_KEY = 'octavia.appearance.v1';
const VALID_THEMES = new Set([
  'dark',
  'oled',
  'light',
  'hicontrast',
  'midnight',
  'sepia',
  'forest',
  'slate',
]);
const VALID_TEXT_SIZES = new Set(['sm', 'md', 'lg']);

// Apply persisted appearance prefs before React mounts so there's no flash of
// the default theme/scale/accent on first paint. We prefer the dedicated
// appearance cache (written by SettingsEffects for guests AND signed-in users)
// and fall back to the guest settings blob; SettingsEffects reconciles both
// once the live settings resolve.
try {
  const appearanceRaw = localStorage.getItem(APPEARANCE_KEY);
  const raw = appearanceRaw || localStorage.getItem(SETTINGS_KEY);
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
    if (settings && VALID_TEXT_SIZES.has(settings.textSize) && settings.textSize !== 'md') {
      document.documentElement.dataset.textSize = settings.textSize;
    }
    const accentPreset = getAccentPreset(settings?.accentColor);
    if (accentPreset) {
      lockPalette([{ h: accentPreset.h, s: accentPreset.s, l: accentPreset.l }]);
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
