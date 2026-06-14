import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { smoothScrollBy } from '@/lib/scroll';

// Width of the cosmetic edge fade. Only ever applied to a side that has
// hidden content beyond it.
const FADE = 'clamp(10px,3vw,16px)';
// A few px of slop so the fade clears completely once the rail is parked at
// either extreme (sub-pixel scroll positions shouldn't keep an edge dimmed).
const EDGE_SLOP = 4;

const HorizontalRail = ({
  children,
  className = '',
  ariaLabel = 'Scrollable music rail',
  scrollStep = 440,
}) => {
  const ref = useRef(null);
  const regionId = useId();
  // Which edges currently have off-screen content. We only fade an edge when
  // there is more to scroll toward it. At rest (scrolled fully to the start or
  // end) the first/last tile must be crisp and fully readable — fading them
  // there clipped the leading tile's artwork, number badge and title, which
  // was the side-scroll bug.
  const [edges, setEdges] = useState({ left: false, right: false });

  const syncEdges = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const left = el.scrollLeft > EDGE_SLOP;
    const right = el.scrollLeft < max - EDGE_SLOP;
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    syncEdges();
    el.addEventListener('scroll', syncEdges, { passive: true });
    // Lazy images and responsive reflow change the scroll extents after mount,
    // so recompute when the rail's content size shifts too.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(syncEdges) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', syncEdges);
      ro?.disconnect();
    };
  }, [syncEdges]);

  const resolveStep = () => {
    const width = ref.current?.clientWidth || scrollStep;
    const derived = Math.round(width * 0.82);
    return Math.max(180, Math.min(560, derived));
  };

  const scroll = (direction) => {
    smoothScrollBy(ref.current, { left: resolveStep() * direction });
  };

  // Build the mask with a real fade only on the side(s) that have more content.
  // A `0px` stop collapses the transparent band to nothing, leaving that edge
  // fully opaque.
  const leftStop = edges.left ? FADE : '0px';
  const rightStop = edges.right ? FADE : '0px';
  const maskImage = `linear-gradient(90deg, transparent 0, #000 ${leftStop}, #000 calc(100% - ${rightStop}), transparent 100%)`;

  return (
    <div className="relative group/rail">
      <div
        id={regionId}
        ref={ref}
        role="region"
        aria-label={ariaLabel}
        // Edge fade-masks blend the leftmost and rightmost tiles into the
        // background so the rail reads as "more is over there" rather than
        // ending abruptly. Applied per-edge so the parked first/last tile stays
        // fully visible. Pure cosmetic; scroll behaviour is unchanged.
        style={{
          WebkitMaskImage: maskImage,
          maskImage,
        }}
        // `overflow-x-auto` promotes overflow-y to `auto` as well (CSS spec),
        // so without vertical room the rail would shear card hover-lifts,
        // magnetic glows, drop shadows, and focus rings at the top/bottom
        // edges. `py-2 -my-2` adds that breathing room with zero net layout
        // shift. Horizontal `-mx-* px-*` keep edge tiles flush to the gutter.
        className={`flex gap-3 sm:gap-4 lg:gap-5 overflow-x-auto no-scrollbar snap-x snap-proximity scroll-pl-2 xs:scroll-pl-3 sm:scroll-pl-6 scroll-pr-4 sm:scroll-pr-6 py-2 -my-2 -mx-0.5 xs:-mx-1 sm:-mx-2 px-0.5 xs:px-1 sm:px-2 focus-ring rounded-sharp ${className}`}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-controls={regionId}
        aria-label="Scroll left"
        className="touch-target hidden xs:flex absolute -left-2 sm:-left-4 top-[42%] -translate-y-1/2 w-10 h-10 rounded-full bg-surface-3/85 backdrop-blur-md border border-white/[0.10] text-ink-2 hover:text-ink hover:border-white/25 opacity-95 md:opacity-0 md:group-hover/rail:opacity-100 md:group-focus-within/rail:opacity-100 focus-visible:opacity-100 transition-all items-center justify-center focus-ring press touch-action-visible"
        style={{
          boxShadow: 'inset 0 1px 0 hsl(var(--ink-primary)/0.08), var(--shadow-2)',
        }}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-controls={regionId}
        aria-label="Scroll right"
        className="touch-target hidden xs:flex absolute -right-2 sm:-right-4 top-[42%] -translate-y-1/2 w-10 h-10 rounded-full bg-surface-3/85 backdrop-blur-md border border-white/[0.10] text-ink-2 hover:text-ink hover:border-white/25 opacity-95 md:opacity-0 md:group-hover/rail:opacity-100 md:group-focus-within/rail:opacity-100 focus-visible:opacity-100 transition-all items-center justify-center focus-ring press touch-action-visible"
        style={{
          boxShadow: 'inset 0 1px 0 hsl(var(--ink-primary)/0.08), var(--shadow-2)',
        }}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default HorizontalRail;
