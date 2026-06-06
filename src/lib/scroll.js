// Centralised smooth-scroll helpers.
//
// We have two scroll contexts in the app:
//   1. The page-level scroller (#main-content) — owned by Lenis when
//      available (see use-lenis-scroll.js). Smooth-scrolls here go
//      through `window.__lenis.scrollTo` so they share the same easing
//      as wheel input.
//   2. Nested native scrollers (rails, sidebar, lyrics, queue, popovers).
//      These keep native `scrollBy` / `scrollIntoView` behaviour because
//      Lenis is told to ignore them via `data-lenis-prevent`.
//
// Each helper falls back to native APIs when Lenis isn't loaded or when
// the target element isn't the Lenis-owned scroller.

const PAGE_SCROLLER_ID = 'main-content';

const getLenis = () =>
  (typeof window !== 'undefined' && window.__lenis) || null;

const isPageScroller = (el) =>
  Boolean(el) && el === document.getElementById(PAGE_SCROLLER_ID);

// Smoothly scroll a container by a relative offset. Used by horizontal
// rails (where `el` is the rail's inner row — a nested scroller, so we
// always hit the native path).
export const smoothScrollBy = (el, { left = 0, top = 0 } = {}) => {
  if (!el) return;
  if (typeof el.scrollBy === 'function') {
    el.scrollBy({ left, top, behavior: 'smooth' });
  } else {
    el.scrollLeft += left;
    el.scrollTop += top;
  }
};

// Smoothly scroll an element to the top. When `el` is the page scroller
// and Lenis is active, route through it so the motion matches wheel
// scrolling; otherwise fall back to native.
export const smoothScrollToTop = (el) => {
  const target = el || document.getElementById(PAGE_SCROLLER_ID);
  if (!target) return;
  const lenis = getLenis();
  if (lenis && isPageScroller(target)) {
    lenis.scrollTo(0, { immediate: false });
    return;
  }
  if (typeof target.scrollTo === 'function') {
    target.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    target.scrollTop = 0;
  }
};

// Reset the page scroller to top instantly. Used on route changes so the
// incoming page mounts at the top without a visible animated scroll
// fighting the existing route push transition.
export const resetPageScroll = () => {
  const target = document.getElementById(PAGE_SCROLLER_ID);
  if (!target) return;
  const lenis = getLenis();
  if (lenis) {
    // Lenis `immediate: true` jumps without interpolation.
    lenis.scrollTo(0, { immediate: true, force: true });
    return;
  }
  if (typeof target.scrollTo === 'function') {
    target.scrollTo({ top: 0, behavior: 'auto' });
  } else {
    target.scrollTop = 0;
  }
};

// Smoothly bring `target` into view. When the closest scroll ancestor is
// the page-level Lenis scroller we route through Lenis; otherwise native
// `scrollIntoView` handles nested cases (lyrics panel, queue, etc.).
export const smoothScrollIntoView = (target, opts = {}) => {
  if (!target) return;
  const lenis = getLenis();
  const pageScroller = document.getElementById(PAGE_SCROLLER_ID);
  // Walk up to find the nearest scroll ancestor. If it's the page
  // scroller, prefer Lenis; otherwise let the browser handle it natively.
  let node = target.parentElement;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') {
      break;
    }
    node = node.parentElement;
  }
  if (lenis && node === pageScroller) {
    lenis.scrollTo(target, { offset: opts.offset ?? -24 });
    return;
  }
  if (typeof target.scrollIntoView === 'function') {
    target.scrollIntoView({
      behavior: 'smooth',
      block: opts.block ?? 'start',
      inline: opts.inline ?? 'nearest',
    });
  }
};
