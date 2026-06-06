import { useEffect, useState } from 'react';

// Quick HSL conversion + saturation/value bias so we don't pick muddy edges.
const rgbToHsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  let s = 0;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = ((b - r) / d + 2);
    else h = ((r - g) / d + 4);
    h *= 60;
  }
  return [h, s * 100, l * 100];
};

const extractFromImage = async (src) => {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = src;
    });
    const SIZE = 64;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    const data = ctx.getImageData(0, 0, SIZE, SIZE).data;

    // Histogram-bin by hue, weight by saturation*value, prefer vivid.
    const bins = new Array(24).fill(null).map(() => ({ count: 0, r: 0, g: 0, b: 0 }));
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 128) continue;
      const [h, s, l] = rgbToHsl(r, g, b);
      if (l < 18 || l > 88) continue;     // skip near-black/near-white
      if (s < 18) continue;                // skip greys
      const bin = Math.floor(h / 15) % 24;
      const weight = (s / 100) * (1 - Math.abs(l - 55) / 55);
      bins[bin].count += weight;
      bins[bin].r += r * weight;
      bins[bin].g += g * weight;
      bins[bin].b += b * weight;
    }
    let best = bins[0];
    for (const b of bins) if (b.count > best.count) best = b;
    if (best.count === 0) return null;
    const r = best.r / best.count;
    const g = best.g / best.count;
    const b = best.b / best.count;
    const [h, s, l] = rgbToHsl(r, g, b);
    return {
      hsl: [Math.round(h), Math.round(Math.min(85, Math.max(45, s))), Math.round(Math.min(65, Math.max(45, l)))],
    };
  } catch (e) {
    console.warn('Color extraction failed', e);
    return null;
  }
};

// Companion accents are offset from the primary on the colour wheel so they
// always feel coordinated with `--track-accent` rather than random. +140 deg
// lands near the complement (warm -> cyan/teal), +250 deg picks up a triadic
// violet/magenta. Saturation/lightness reuse the same WCAG-friendly clamps as
// the primary so chrome surfaces never go muddy or blinding.
const ACCENT_2_HUE_SHIFT = 140;
const ACCENT_3_HUE_SHIFT = 250;
const wrapHue = (h) => ((h % 360) + 360) % 360;

const setRootAccent = (h, s, l) => {
  const root = document.documentElement;
  root.style.setProperty('--track-accent', `${h} ${s}% ${l}%`);
  root.style.setProperty('--track-accent-strong', `${h} ${Math.min(100, s + 5)}% ${Math.max(20, l - 12)}%`);
  // Pick foreground that contrasts.
  const fg = l > 55 ? '222 47% 8%' : '0 0% 100%';
  root.style.setProperty('--track-accent-foreground', fg);

  const h2 = wrapHue(h + ACCENT_2_HUE_SHIFT);
  const h3 = wrapHue(h + ACCENT_3_HUE_SHIFT);
  root.style.setProperty('--track-accent-2', `${h2} ${s}% ${l}%`);
  root.style.setProperty('--track-accent-2-strong', `${h2} ${Math.min(100, s + 5)}% ${Math.max(20, l - 8)}%`);
  root.style.setProperty('--track-accent-3', `${h3} ${s}% ${l}%`);
  root.style.setProperty('--track-accent-3-strong', `${h3} ${Math.min(100, s + 5)}% ${Math.max(20, l - 8)}%`);
};

const resetRootAccent = () => {
  const root = document.documentElement;
  root.style.removeProperty('--track-accent');
  root.style.removeProperty('--track-accent-strong');
  root.style.removeProperty('--track-accent-foreground');
  root.style.removeProperty('--track-accent-2');
  root.style.removeProperty('--track-accent-2-strong');
  root.style.removeProperty('--track-accent-3');
  root.style.removeProperty('--track-accent-3-strong');
};

export const useColorExtraction = (imageUrl) => {
  useEffect(() => {
    if (!imageUrl) {
      resetRootAccent();
      return;
    }
    let cancelled = false;
    (async () => {
      const result = await extractFromImage(imageUrl);
      if (cancelled || !result) return;
      const [h, s, l] = result.hsl;
      setRootAccent(h, s, l);
    })();
    return () => { cancelled = true; };
  }, [imageUrl]);
};

// Scoped variant: runs the same histogram extraction but returns the HSL triple
// in component state instead of writing to `:root`. The caller applies it as
// an inline CSS variable on a wrapper element, so per-page accents (artist
// portrait, hero backdrops) don't compete with `useColorExtraction`'s root
// `--track-accent` (owned by the playing track via FooterPlayer).
//
// Returns `{ h, s, l, ready }`. While extraction is in flight (or if the
// extractor returns no usable swatch) `ready` is false and the consumer
// should fall back to its default styling.
export const useScopedArtistAccent = (imageUrl) => {
  const [accent, setAccent] = useState({ h: 0, s: 0, l: 0, ready: false });

  useEffect(() => {
    if (!imageUrl) {
      setAccent({ h: 0, s: 0, l: 0, ready: false });
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const result = await extractFromImage(imageUrl);
      if (cancelled) return;
      if (!result) {
        setAccent({ h: 0, s: 0, l: 0, ready: false });
        return;
      }
      const [h, s, l] = result.hsl;
      setAccent({ h, s, l, ready: true });
    })();
    return () => { cancelled = true; };
  }, [imageUrl]);

  return accent;
};

export { setRootAccent, resetRootAccent };
