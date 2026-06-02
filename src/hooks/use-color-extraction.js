import { useEffect } from 'react';

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

const setRootAccent = (h, s, l) => {
  const root = document.documentElement;
  root.style.setProperty('--track-accent', `${h} ${s}% ${l}%`);
  root.style.setProperty('--track-accent-strong', `${h} ${Math.min(100, s + 5)}% ${Math.max(20, l - 12)}%`);
  // Pick foreground that contrasts.
  const fg = l > 55 ? '222 47% 8%' : '0 0% 100%';
  root.style.setProperty('--track-accent-foreground', fg);
};

const resetRootAccent = () => {
  const root = document.documentElement;
  root.style.removeProperty('--track-accent');
  root.style.removeProperty('--track-accent-strong');
  root.style.removeProperty('--track-accent-foreground');
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

export { setRootAccent, resetRootAccent };
