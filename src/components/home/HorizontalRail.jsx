import { useId, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const HorizontalRail = ({
  children,
  className = '',
  ariaLabel = 'Scrollable music rail',
  scrollStep = 440,
}) => {
  const ref = useRef(null);
  const regionId = useId();

  const scroll = (dx) => {
    ref.current?.scrollBy({ left: dx, behavior: 'smooth' });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scroll(-scrollStep);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scroll(scrollStep);
    }
  };

  return (
    <div className="relative group/rail">
      <div
        id={regionId}
        ref={ref}
        role="region"
        tabIndex={0}
        aria-label={ariaLabel}
        onKeyDown={handleKeyDown}
        // Edge fade-masks blend the leftmost and rightmost tiles into the
        // background so the rail reads as "more is over there" rather than
        // ending abruptly. Pure cosmetic; scroll behaviour is unchanged.
        style={{
          WebkitMaskImage:
            'linear-gradient(90deg, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%)',
          maskImage:
            'linear-gradient(90deg, transparent 0, #000 24px, #000 calc(100% - 24px), transparent 100%)',
        }}
        className={`flex gap-5 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-pl-6 -mx-2 px-2 focus-ring rounded-sharp ${className}`}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => scroll(-scrollStep)}
        aria-controls={regionId}
        aria-label="Scroll left"
        className="absolute -left-4 top-[42%] -translate-y-1/2 w-9 h-9 rounded-full bg-surface-3/85 backdrop-blur-md border border-white/[0.10] text-ink-2 hover:text-ink hover:border-white/25 opacity-80 md:opacity-0 md:group-hover/rail:opacity-100 md:group-focus-within/rail:opacity-100 focus-visible:opacity-100 transition-all flex items-center justify-center focus-ring press"
        style={{
          boxShadow: 'inset 0 1px 0 hsl(var(--ink-primary)/0.08), var(--shadow-2)',
        }}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => scroll(scrollStep)}
        aria-controls={regionId}
        aria-label="Scroll right"
        className="absolute -right-4 top-[42%] -translate-y-1/2 w-9 h-9 rounded-full bg-surface-3/85 backdrop-blur-md border border-white/[0.10] text-ink-2 hover:text-ink hover:border-white/25 opacity-80 md:opacity-0 md:group-hover/rail:opacity-100 md:group-focus-within/rail:opacity-100 focus-visible:opacity-100 transition-all flex items-center justify-center focus-ring press"
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
