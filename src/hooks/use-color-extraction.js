import { useEffect, useState } from 'react';

// =============================================================================
// Runtime palette extraction + cinematic HSL lerp.
//
// The player surfaces consume three coordinated accents at all times
// (`--track-accent`, `--track-accent-2`, `--track-accent-3`, plus their
// `-strong` companions). Historically we extracted ONE swatch from the cover
// art and rotated it +140° / +250° to synthesize 2 and 3 — that worked but
// always read a little "generated."
//
// This module now:
//   • picks the TOP THREE distinct hue clusters from the artwork (with a
//     minimum hue separation so they never collapse onto each other);
//   • backfills with hue-shifted fallbacks when fewer than three vivid
//     clusters exist;
//   • lerps from the currently applied palette to the new one over ~700ms
//     using shortest-arc hue interpolation, so transitions between songs
//     feel cinematic and organic instead of snapping.
//
// `setRootAccent(h, s, l)` and `resetRootAccent()` keep their signatures so
// the accent rotator and other callers don't need to change — they now go
// through the same lerp pipeline as the image extractor.
// =============================================================================

// ----- HSL helpers ----------------------------------------------------------

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

const wrapHue = (h) => ((h % 360) + 360) % 360;

// Shortest-arc hue lerp: never spins all the way around the wheel.
const lerpHue = (a, b, t) => {
  const delta = ((b - a + 540) % 360) - 180;
  return wrapHue(a + delta * t);
};

const lerp = (a, b, t) => a + (b - a) * t;

// Cubic-bezier(0.22, 1, 0.36, 1) feel — strong deceleration toward the end.
const easeOut = (t) => 1 - Math.pow(1 - t, 4);

// ----- Multi-swatch extraction ----------------------------------------------

// Saturation / lightness clamps that keep all three accents legible against
// the dark UI and against each other. Identical to the original behavior so
// chrome contrast (and the WCAG-aware foreground picker below) stays intact.
const clampS = (s) => Math.min(85, Math.max(45, s));
const clampL = (l) => Math.min(65, Math.max(45, l));

const HUE_BIN_SIZE = 15;     // 360 / 15 = 24 bins
const HUE_BIN_COUNT = 360 / HUE_BIN_SIZE;
const MIN_HUE_SEPARATION = 35; // degrees between accepted swatches

// Hue-shift fallbacks used when the artwork only yields one (or two)
// distinct vivid clusters. Matches the original +140 / +250 behavior so the
// look stays consistent for monochromatic covers.
const ACCENT_2_HUE_SHIFT = 140;
const ACCENT_3_HUE_SHIFT = 250;

const hueDistance = (a, b) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
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

    const bins = Array.from({ length: HUE_BIN_COUNT }, () => ({
      count: 0,
      r: 0,
      g: 0,
      b: 0,
    }));
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      if (a < 128) continue;
      const [h, s, l] = rgbToHsl(r, g, b);
      if (l < 18 || l > 88) continue;
      if (s < 18) continue;
      const bin = Math.floor(h / HUE_BIN_SIZE) % HUE_BIN_COUNT;
      const weight = (s / 100) * (1 - Math.abs(l - 55) / 55);
      bins[bin].count += weight;
      bins[bin].r += r * weight;
      bins[bin].g += g * weight;
      bins[bin].b += b * weight;
    }

    // Sort bins by weight descending, then greedy-pick three that are at
    // least MIN_HUE_SEPARATION degrees apart on the wheel.
    const sorted = bins
      .map((bin, idx) => ({ bin, idx }))
      .filter((entry) => entry.bin.count > 0)
      .sort((a, b) => b.bin.count - a.bin.count);

    if (sorted.length === 0) return null;

    const swatches = [];
    for (const { bin } of sorted) {
      const r = bin.r / bin.count;
      const g = bin.g / bin.count;
      const b = bin.b / bin.count;
      const [h, s, l] = rgbToHsl(r, g, b);
      const candidate = {
        h: Math.round(h),
        s: Math.round(clampS(s)),
        l: Math.round(clampL(l)),
      };
      const isDistinct = swatches.every(
        (other) => hueDistance(other.h, candidate.h) >= MIN_HUE_SEPARATION,
      );
      if (isDistinct) swatches.push(candidate);
      if (swatches.length >= 3) break;
    }

    if (swatches.length === 0) return null;
    return swatches;
  } catch (e) {
    console.warn('Color extraction failed', e);
    return null;
  }
};

// Turn whatever the extractor found into a stable 3-swatch palette. When the
// artwork is monochromatic, the missing slots fall back to the +140 / +250
// hue rotation so the old behavior is preserved for those covers.
const completePalette = (swatches) => {
  const first = swatches[0];
  const second = swatches[1] ?? {
    h: wrapHue(first.h + ACCENT_2_HUE_SHIFT),
    s: first.s,
    l: first.l,
  };
  const third = swatches[2] ?? {
    h: wrapHue(first.h + ACCENT_3_HUE_SHIFT),
    s: first.s,
    l: first.l,
  };
  return [first, second, third];
};

// ----- RAF lerp + var application -------------------------------------------

const VAR_KEYS = [
  '--track-accent',
  '--track-accent-strong',
  '--track-accent-2',
  '--track-accent-2-strong',
  '--track-accent-3',
  '--track-accent-3-strong',
  '--track-accent-foreground',
];

const buildStrong = (p) => ({
  h: p.h,
  s: Math.min(100, p.s + 5),
  l: Math.max(20, p.l - 12),
});

const buildStrongSecondary = (p) => ({
  h: p.h,
  s: Math.min(100, p.s + 5),
  l: Math.max(20, p.l - 8),
});

const paletteToTokens = (palette) => {
  const [a, b, c] = palette;
  return {
    primary: a,
    primaryStrong: buildStrong(a),
    secondary: b,
    secondaryStrong: buildStrongSecondary(b),
    tertiary: c,
    tertiaryStrong: buildStrongSecondary(c),
  };
};

const writeTokens = (tokens) => {
  const root = document.documentElement;
  root.style.setProperty(
    '--track-accent',
    `${Math.round(tokens.primary.h)} ${Math.round(tokens.primary.s)}% ${Math.round(tokens.primary.l)}%`,
  );
  root.style.setProperty(
    '--track-accent-strong',
    `${Math.round(tokens.primaryStrong.h)} ${Math.round(tokens.primaryStrong.s)}% ${Math.round(tokens.primaryStrong.l)}%`,
  );
  root.style.setProperty(
    '--track-accent-2',
    `${Math.round(tokens.secondary.h)} ${Math.round(tokens.secondary.s)}% ${Math.round(tokens.secondary.l)}%`,
  );
  root.style.setProperty(
    '--track-accent-2-strong',
    `${Math.round(tokens.secondaryStrong.h)} ${Math.round(tokens.secondaryStrong.s)}% ${Math.round(tokens.secondaryStrong.l)}%`,
  );
  root.style.setProperty(
    '--track-accent-3',
    `${Math.round(tokens.tertiary.h)} ${Math.round(tokens.tertiary.s)}% ${Math.round(tokens.tertiary.l)}%`,
  );
  root.style.setProperty(
    '--track-accent-3-strong',
    `${Math.round(tokens.tertiaryStrong.h)} ${Math.round(tokens.tertiaryStrong.s)}% ${Math.round(tokens.tertiaryStrong.l)}%`,
  );
  const fg = tokens.primary.l > 55 ? '222 47% 8%' : '0 0% 100%';
  root.style.setProperty('--track-accent-foreground', fg);
};

const lerpTokens = (from, to, t) => ({
  primary: {
    h: lerpHue(from.primary.h, to.primary.h, t),
    s: lerp(from.primary.s, to.primary.s, t),
    l: lerp(from.primary.l, to.primary.l, t),
  },
  primaryStrong: {
    h: lerpHue(from.primaryStrong.h, to.primaryStrong.h, t),
    s: lerp(from.primaryStrong.s, to.primaryStrong.s, t),
    l: lerp(from.primaryStrong.l, to.primaryStrong.l, t),
  },
  secondary: {
    h: lerpHue(from.secondary.h, to.secondary.h, t),
    s: lerp(from.secondary.s, to.secondary.s, t),
    l: lerp(from.secondary.l, to.secondary.l, t),
  },
  secondaryStrong: {
    h: lerpHue(from.secondaryStrong.h, to.secondaryStrong.h, t),
    s: lerp(from.secondaryStrong.s, to.secondaryStrong.s, t),
    l: lerp(from.secondaryStrong.l, to.secondaryStrong.l, t),
  },
  tertiary: {
    h: lerpHue(from.tertiary.h, to.tertiary.h, t),
    s: lerp(from.tertiary.s, to.tertiary.s, t),
    l: lerp(from.tertiary.l, to.tertiary.l, t),
  },
  tertiaryStrong: {
    h: lerpHue(from.tertiaryStrong.h, to.tertiaryStrong.h, t),
    s: lerp(from.tertiaryStrong.s, to.tertiaryStrong.s, t),
    l: lerp(from.tertiaryStrong.l, to.tertiaryStrong.l, t),
  },
});

// Module-level current palette + raf id so cross-component callers
// (rotator and image extractor) share a single source of truth and any
// in-flight animation is cancellable.
let CURRENT_TOKENS = null;
let RAF_ID = 0;
const LERP_DURATION_MS = 700;

// When the user pins a fixed accent in Settings, we LOCK the pipeline: the
// rotator and the cover-art extractor keep calling setRootPalette /
// resetRootAccent, but those writes become no-ops so the chosen accent sticks.
let LOCKED = false;

const reduceMotion = () => {
  if (typeof window === 'undefined') return false;
  if (typeof document !== 'undefined' && document.documentElement.dataset.reduceMotion === 'true') {
    return true;
  }
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
};

const animateTo = (next) => {
  if (typeof window === 'undefined') {
    CURRENT_TOKENS = next;
    return;
  }
  if (RAF_ID) {
    window.cancelAnimationFrame(RAF_ID);
    RAF_ID = 0;
  }
  // First commit ever, or reduce-motion → snap straight to the target.
  if (!CURRENT_TOKENS || reduceMotion()) {
    CURRENT_TOKENS = next;
    writeTokens(next);
    return;
  }
  const from = CURRENT_TOKENS;
  const to = next;
  const start = performance.now();
  const tick = (now) => {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / LERP_DURATION_MS);
    const eased = easeOut(t);
    const frame = lerpTokens(from, to, eased);
    writeTokens(frame);
    if (t < 1) {
      RAF_ID = window.requestAnimationFrame(tick);
    } else {
      CURRENT_TOKENS = to;
      RAF_ID = 0;
    }
  };
  RAF_ID = window.requestAnimationFrame(tick);
};

// ----- Public surface --------------------------------------------------------

// Apply a full 3-swatch palette (lerps from the currently applied one).
export const setRootPalette = (palette) => {
  if (LOCKED) return;
  if (!Array.isArray(palette) || palette.length === 0) return;
  const completed = completePalette(palette.slice(0, 3));
  animateTo(paletteToTokens(completed));
};

// Backwards-compatible single-accent setter. Builds a default 3-swatch
// palette via the +140 / +250 hue rotation and routes through the same lerp.
export const setRootAccent = (h, s, l) => {
  const clamped = { h, s: clampS(s), l: clampL(l) };
  setRootPalette([clamped]);
};

export const resetRootAccent = () => {
  if (LOCKED) return;
  if (typeof window !== 'undefined' && RAF_ID) {
    window.cancelAnimationFrame(RAF_ID);
    RAF_ID = 0;
  }
  CURRENT_TOKENS = null;
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  VAR_KEYS.forEach((key) => root.style.removeProperty(key));
};

// Pin a user-chosen accent. The palette ({ h, s, l }[]) is applied immediately
// (no lerp) and the pipeline is locked so the rotator / cover-art extractor
// stop overriding it. Safe to call repeatedly (idempotent for a given palette).
export const lockPalette = (palette) => {
  if (!Array.isArray(palette) || palette.length === 0) return;
  LOCKED = false;
  if (typeof window !== 'undefined' && RAF_ID) {
    window.cancelAnimationFrame(RAF_ID);
    RAF_ID = 0;
  }
  const completed = completePalette(palette.slice(0, 3));
  const tokens = paletteToTokens(completed);
  CURRENT_TOKENS = tokens;
  if (typeof document !== 'undefined') writeTokens(tokens);
  LOCKED = true;
};

// Release the lock and clear inline vars so the dynamic pipeline (rotator /
// cover-art extractor) can resume owning the accent on its next tick.
export const unlockPalette = () => {
  if (!LOCKED) return;
  LOCKED = false;
  resetRootAccent();
};

// ----- Hooks -----------------------------------------------------------------

export const useColorExtraction = (imageUrl) => {
  useEffect(() => {
    if (!imageUrl) {
      resetRootAccent();
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const palette = await extractFromImage(imageUrl);
      if (cancelled || !palette) return;
      setRootPalette(palette);
    })();
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);
};

// Scoped variant for per-page accents (artist portrait, hero backdrops, etc).
// Returns the dominant swatch in component state so the consumer applies it
// as an inline CSS variable on a wrapper and doesn't compete with the global
// `--track-accent` owned by the playing track.
export const useScopedArtistAccent = (imageUrl) => {
  const [accent, setAccent] = useState({ h: 0, s: 0, l: 0, ready: false });

  useEffect(() => {
    if (!imageUrl) {
      setAccent({ h: 0, s: 0, l: 0, ready: false });
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const palette = await extractFromImage(imageUrl);
      if (cancelled) return;
      if (!palette || palette.length === 0) {
        setAccent({ h: 0, s: 0, l: 0, ready: false });
        return;
      }
      const { h, s, l } = palette[0];
      setAccent({ h, s, l, ready: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  return accent;
};
