// Motion primitives. Import these instead of writing inline Framer variants.
// Honors the in-app `reduceMotion` setting via the data attribute on <html>,
// which CSS already collapses; here we additionally short-circuit Framer
// variants so they don't even animate.

const isReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  if (typeof document !== 'undefined' && document.documentElement.dataset.reduceMotion === 'true') {
    return true;
  }
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
};

const safe = (variants) => {
  if (!isReducedMotion()) return variants;
  return Object.fromEntries(
    Object.entries(variants).map(([k, v]) => [
      k,
      { ...v, transition: { duration: 0 } },
    ]),
  );
};

// Easings (paired with Tailwind's `ease-emphasis`, etc.)
export const easings = {
  emphasis: [0.22, 1, 0.36, 1],
  decel: [0, 0, 0.2, 1],
  accel: [0.4, 0, 1, 1],
  spring: [0.34, 1.56, 0.64, 1],
};

export const durations = {
  instant: 0.08,
  short: 0.14,
  med: 0.22,
  long: 0.38,
  xlong: 0.6,
};

// Canonical spring presets for shared UI patterns.
export const springs = {
  snappy: { type: 'spring', stiffness: 380, damping: 30 },
  overlay: { type: 'spring', stiffness: 360, damping: 32 },
  sheet: { type: 'spring', stiffness: 280, damping: 32 },
};

export const fadeUp = safe({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: durations.med, ease: easings.emphasis } },
  exit:    { opacity: 0, y: -8, transition: { duration: durations.short, ease: easings.accel } },
});

export const fadeIn = safe({
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: durations.med, ease: easings.emphasis } },
  exit:    { opacity: 0, transition: { duration: durations.short, ease: easings.accel } },
});

export const scaleIn = safe({
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: { duration: durations.med, ease: easings.emphasis } },
  exit:    { opacity: 0, scale: 0.98, transition: { duration: durations.short, ease: easings.accel } },
});

export const cardEnter = safe({
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: durations.long, ease: easings.emphasis } },
});

export const sheetUp = safe({
  initial: { y: '100%', opacity: 0.6 },
  animate: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 280, damping: 32 } },
  exit:    { y: '100%', opacity: 0, transition: { duration: durations.long, ease: easings.accel } },
});

export const pagePush = safe({
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: durations.med, ease: easings.emphasis } },
  exit:    { opacity: 0, y: -8, transition: { duration: durations.short, ease: easings.accel } },
});

export const panelSwap = safe({
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0, transition: { duration: durations.med, ease: easings.emphasis } },
  exit: { opacity: 0, x: -12, transition: { duration: durations.short, ease: easings.accel } },
});

export const staggerChildren = (stagger = 0.04, delayChildren = 0) => ({
  initial: {},
  animate: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

export const tap = isReducedMotion() ? {} : { scale: 0.96 };
export const hoverLift = isReducedMotion() ? {} : { y: -2 };

export { isReducedMotion };
