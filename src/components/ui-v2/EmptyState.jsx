import { cn } from '@/lib/utils';

/**
 * Editorial empty state.
 * Hairline-outlined icon ring with a slow iris orbit (Gen Z accent), a serif
 * title, optional italic display accent, soft description, and any action(s)
 * the caller passes. Action area is wrapped in `.sticker` so the primary CTA
 * gets a playful tilt-and-settle on hover.
 */
const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  accent,
}) => (
  <div
    className={cn(
      'text-center py-20 px-4 max-w-md mx-auto',
      className,
    )}
  >
    {Icon ? (
      <div className="relative w-20 h-20 mx-auto mb-7 rounded-full border border-white/[0.10] flex items-center justify-center">
        {/* Iridescent orbit ring — a slow conic gradient halos the icon. */}
        <span
          aria-hidden="true"
          className="absolute -inset-1 rounded-full opacity-70 pointer-events-none"
          style={{
            background:
              'conic-gradient(from 120deg, hsl(var(--accent-iris-a) / 0.55), hsl(var(--accent-iris-b) / 0.55), hsl(var(--accent-iris-c) / 0.55), hsl(var(--accent-iris-a) / 0.55))',
            WebkitMask:
              'radial-gradient(closest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))',
            mask:
              'radial-gradient(closest-side, transparent calc(100% - 2px), #000 calc(100% - 1px))',
            animation: 'holo-spin 9s linear infinite',
          }}
        />
        {/* Inner accent ring */}
        <span
          aria-hidden="true"
          className="absolute inset-[6px] rounded-full border border-white/[0.04]"
        />
        {/* Friendly bouncy "sparkle" — a tiny SVG glyph that nudges on hover */}
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 text-iris"
          style={{ animation: 'np-edge-breathe 3.4s ease-in-out infinite' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 0 L8.4 5.6 L14 7 L8.4 8.4 L7 14 L5.6 8.4 L0 7 L5.6 5.6 Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <Icon
          className="w-8 h-8 text-track relative"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>
    ) : null}
    <h3 className="font-display text-2xl text-ink leading-tight mb-3">
      {title}
      {accent ? (
        <>
          {' '}
          <em className="font-editorial text-track not-italic">{accent}</em>
        </>
      ) : null}
    </h3>
    {description ? (
      <p className="font-editorial italic text-[14px] text-ink-3 leading-relaxed">
        {description}
      </p>
    ) : null}
    {action ? (
      <div className="mt-7 flex justify-center gap-3 flex-wrap">{action}</div>
    ) : null}
  </div>
);

export default EmptyState;
