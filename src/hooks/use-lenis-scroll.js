import { useEffect } from 'react';

// =============================================================================
// useLenisScroll — page-level smooth scroll hook.
//
// History: an earlier version of this hook attached Lenis to `#main-content`
// with a custom `wrapper` + `content` pair. It worked in isolation, but in
// our layout `<main>` houses a `<motion.div key={pathname}>` whose key
// changes on every route navigation. Lenis's `Dimensions` class observes
// the content via `ResizeObserver`; when React unmounted that motion.div
// and mounted a fresh one, the observer ended up watching a detached node
// while Lenis kept calling `preventDefault` on wheel events. The visible
// symptom was "I can't scroll" — wheel input was eaten, programmatic
// scroll worked but the page never moved.
//
// Until we restructure `<main>` to expose a stable inner wrapper for
// Lenis content (a small refactor that can ship separately), this hook is
// intentionally a no-op. Native scrolling on `<main>` is preserved and the
// browser already animates wheel input smoothly. Programmatic smooth
// scrolls flow through `src/lib/scroll.js`, which falls back to native
// `scrollTo({ behavior: 'smooth' })` whenever `window.__lenis` isn't set.
// All the supporting pieces from the plan (data-lenis-prevent attributes,
// snap-proximity, lyrics auto-scroll pause, Firefox scrollbar parity,
// route-change scroll reset) still apply.
// =============================================================================

export const useLenisScroll = (_options = {}) => {
  useEffect(() => undefined, []);
};

export default useLenisScroll;
