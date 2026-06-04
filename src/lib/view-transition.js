// =============================================================================
// View Transitions API helper
// -----------------------------------------------------------------------------
// Thin shim around `document.startViewTransition` so we get a smooth cross-fade
// (and per-element morph for elements that share a `view-transition-name`)
// when navigating between routes. Falls back to calling the update function
// directly on browsers without the API (Firefox/Safari older versions) — the
// app keeps working, just without the morph.
//
// React Router 6 dispatches its updates asynchronously, so we wrap the update
// in `flushSync` to force a synchronous DOM commit inside the transition. This
// is the pattern recommended by both Chrome team docs and react-router's own
// experimental View Transition support.
// =============================================================================

import { flushSync } from 'react-dom';

const isSupported = () =>
  typeof document !== 'undefined' &&
  typeof document.startViewTransition === 'function';

const isReducedMotion = () => {
  if (typeof document === 'undefined') return false;
  if (document.documentElement?.dataset?.reduceMotion === 'true') return true;
  return Boolean(
    typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
};

// Tiny "whoosh" cue fired on every page morph. We can't pull `useSounds`
// here (this is a plain JS helper, not a React component), so we read the
// settings directly out of localStorage to match the SoundProvider's gate.
const SETTINGS_KEY = 'octavia.settings.v1';
const playWhoosh = () => {
  try {
    const raw =
      typeof localStorage !== 'undefined' ? localStorage.getItem(SETTINGS_KEY) : null;
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.soundEffects === false) return;
    }
  } catch { /* fall through and play */ }
  if (typeof window === 'undefined') return;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return;
  try {
    const ctx = (playWhoosh._ctx ||= new Ctor());
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.16);
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.045, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.2);
  } catch {
    /* audio engine refused; silent failure is fine */
  }
};

/**
 * Runs `update` inside a view transition. `update` should perform the work
 * that mutates the DOM (e.g. calling `navigate(...)`). Returns the
 * `ViewTransition` (or `undefined` if unsupported / reduced-motion).
 */
export function withViewTransition(update) {
  if (typeof update !== 'function') return undefined;
  if (!isSupported() || isReducedMotion()) {
    update();
    return undefined;
  }
  try {
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        update();
      });
    });
    // Cue the whoosh once the new frame is committed so it lines up with the
    // visual morph rather than the click.
    transition?.ready?.then?.(playWhoosh).catch?.(() => {});
    return transition;
  } catch {
    update();
    return undefined;
  }
}

/**
 * Builds a CSS-safe `view-transition-name` value. Names must be single
 * identifiers — no spaces, slashes, or weird characters.
 */
export function vtName(prefix, id) {
  if (id == null) return `${prefix}`;
  const safe = String(id).replace(/[^A-Za-z0-9_-]/g, '_');
  return `${prefix}-${safe}`;
}
