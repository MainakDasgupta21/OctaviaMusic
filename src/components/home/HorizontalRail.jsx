import { useId, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { smoothScrollBy } from '@/lib/scroll';

const HorizontalRail = ({
  children,
  className = '',
  ariaLabel = 'Scrollable music rail',
  scrollStep = 440,
}) => {
  const ref = useRef(null);
  const regionId = useId();

  const resolveStep = () => {
    const width = ref.current?.clientWidth || scrollStep;
    const derived = Math.round(width * 0.82);
    return Math.max(180, Math.min(560, derived));
  };

  const scroll = (direction) => {
    smoothScrollBy(ref.current, { left: resolveStep() * direction });
  };

  return (
    <div className="relative group/rail">
      <div
        id={regionId}
        ref={ref}
        role="region"
        aria-label={ariaLabel}
        // Edge fade-masks blend the leftmost and rightmost tiles into the
        // background so the rail reads as "more is over there" rather than
        // ending abruptly. Pure cosmetic; scroll behaviour is unchanged.
        style={{
          WebkitMaskImage:
            'linear-gradient(90deg, transparent 0, #000 clamp(10px,3vw,16px), #000 calc(100% - clamp(10px,3vw,16px)), transparent 100%)',
          maskImage:
            'linear-gradient(90deg, transparent 0, #000 clamp(10px,3vw,16px), #000 calc(100% - clamp(10px,3vw,16px)), transparent 100%)',
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
