import { useEffect } from 'react';
import Lenis from 'lenis';

// =============================================================================
// useLenisScroll — page-level smooth scroll for the `#main-content` scroller.
//
// Lenis smooths wheel input on the page scroller so vertical scrolling reads
// buttery instead of stepped. The whole app is already wired for it
// (`data-lenis-prevent` on every nested scroller — queue, lyrics, sidebar,
// command palette, drawers — and `window.__lenis` fast-paths in
// `src/lib/scroll.js`), this hook is the piece that turns it on.
//
// History / the bug this fixes: an earlier version attached Lenis with its
// content set to `<main>`'s direct child, which was a `<motion.div
// key={pathname}>` that React remounts on every route change. Lenis's
// `Dimensions` watches the content node via `ResizeObserver`; when that node
// detached, Lenis kept calling `preventDefault` on wheel events while the
// limit went stale — the page simply stopped scrolling. The fix is a stable
// inner wrapper (`#main-scroll-content`, added in MainLayout) that never
// remounts; the keyed motion.div now swaps freely *inside* it.
//
// Notes:
//   - Touch is intentionally left on the native compositor (`syncTouch:
//     false`); smoothing touch fights the OS momentum and feels laggy.
//   - Honours reduced motion (both the OS media query and the app's own
//     setting via the `enabled` flag from MainLayout).
//   - Skips the /player route, which locks scroll entirely.
// =============================================================================

const WRAPPER_ID = 'main-content';
const CONTENT_ID = 'main-scroll-content';

export const useLenisScroll = ({ enabled = true } = {}) => {
  useEffect(() => {
    if (!enabled) return undefined;
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    // Respect the OS "reduce motion" preference: animated page smoothing is
    // exactly the kind of motion these users opt out of.
    const prefersReducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    )?.matches;
    if (prefersReducedMotion) return undefined;

    const wrapper = document.getElementById(WRAPPER_ID);
    const content = document.getElementById(CONTENT_ID);
    if (!wrapper || !content) return undefined;

    const lenis = new Lenis({
      wrapper,
      content,
      // Velocity-based (frame-rate independent) smoothing. ~0.1 is Lenis's
      // tuned default — smooth but still responsive, not floaty.
      lerp: 0.1,
      smoothWheel: true,
      // Leave touch on the native compositor — momentum smoothing on touch
      // fights the OS and feels laggy.
      syncTouch: false,
      wheelMultiplier: 1,
      // Critical for the horizontal card rails / tab / chip bars: when a
      // gesture lands on a nested scroller that can scroll in that direction,
      // hand it to the browser natively instead of capturing it for page
      // smoothing. This is what lets you side-scroll the rails (any device)
      // while vertical input over them still smooth-scrolls the page.
      allowNestedScroll: true,
    });

    // Shared with src/lib/scroll.js so programmatic scrolls (scroll-to-top,
    // route reset, scroll-into-view) ride the same easing as wheel input.
    window.__lenis = lenis;

    let rafId = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    });

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      if (window.__lenis === lenis) {
        delete window.__lenis;
      }
    };
  }, [enabled]);
};

export default useLenisScroll;
