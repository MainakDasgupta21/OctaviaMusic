import { cn } from '@/lib/utils';

// =============================================================================
// Octavia brand (v2 — premium and standard)
// -----------------------------------------------------------------------------
// One strong silhouette, one confident wordmark, one stable brand colour.
// Voice target: Apple Music / Tidal / Linear — restrained, geometric, premium.
//
// The mark is an all-orange bullseye: an outer ring plus a centre dot, drawn
// as a single evenodd path of three concentric circles (outer ring, middle
// hole, centre dot). The gap between the ring and the dot is NOT painted —
// it is transparent, so the page background shows through it. That makes the
// mark read white-on-white on light surfaces and dark on dark surfaces with
// no per-theme colour swap, which is exactly the adaptive behaviour we want.
//
// There is no chip — the bullseye sits directly on whatever surface hosts it.
//
// The wordmark is plain HTML — sans-serif renders crisper as native text and
// drops the SVG dependency for a piece of UI that doesn't need it.
//
// Variants:
//   - solid    brand-orange bullseye (default; used on sidebar, drawer, splash)
//   - outline  brand-orange bullseye (kept for API parity with v1)
//   - mono     currentColor bullseye (404 and other restrained contexts)
// =============================================================================

const MARK_PATH =
  // Outer ring: center (32, 32), radius 23.
  'M 9 32 A 23 23 0 1 0 55 32 A 23 23 0 1 0 9 32 Z '
  // Middle hole: radius 16.5 — even-odd cuts it from the outer circle to
  // leave the orange ring.
  + 'M 15.5 32 A 16.5 16.5 0 1 0 48.5 32 A 16.5 16.5 0 1 0 15.5 32 Z '
  // Centre dot: radius 10.5 — re-filled inside the hole by even-odd, leaving
  // a transparent gap between it and the ring.
  + 'M 21.5 32 A 10.5 10.5 0 1 0 42.5 32 A 10.5 10.5 0 1 0 21.5 32 Z';

const markVariantStyles = (variant) => {
  switch (variant) {
    case 'mono':
      return { markFill: 'currentColor' };
    case 'outline':
    case 'solid':
    default:
      return { markFill: 'hsl(var(--brand-500))' };
  }
};

// `animated` is accepted for API compatibility (v1) but no-op in v2 — premium
// brands keep their chrome static; motion lives in the splash only.
export const LogoMark = ({
  size = 40,
  variant = 'solid',
  className,
  ariaLabel = 'Octavia',
  // eslint-disable-next-line no-unused-vars
  animated = false,
}) => {
  const styles = markVariantStyles(variant);

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center select-none',
        className,
      )}
      style={{
        width: size,
        height: size,
        viewTransitionName: 'vt-logo',
      }}
      role="img"
      aria-label={ariaLabel}
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        aria-hidden="true"
        focusable="false"
      >
        {/* The bullseye — orange ring + centre dot, transparent gap */}
        <path d={MARK_PATH} fillRule="evenodd" fill={styles.markFill} />
      </svg>
    </span>
  );
};

// -----------------------------------------------------------------------------
// Wordmark — lowercase Roboto Medium, single solid colour.
// -----------------------------------------------------------------------------

const wordmarkSizeClass = {
  sm: 'text-[15px]',
  md: 'text-[22px]',
  lg: 'text-5xl',
  xl: 'text-7xl',
};

const wordmarkVariantClass = {
  ink: 'text-ink',
  mono: 'text-current',
  brand: 'text-[hsl(var(--brand-500))]',
};

export const Wordmark = ({
  className,
  size = 'md',
  variant = 'ink',
}) => (
  <span
    className={cn(
      'font-display font-medium leading-none lowercase select-none',
      'tracking-[-0.025em]',
      wordmarkSizeClass[size] || wordmarkSizeClass.md,
      wordmarkVariantClass[variant] || wordmarkVariantClass.ink,
      className,
    )}
  >
    octavia
  </span>
);

// -----------------------------------------------------------------------------
// LogoLockup — the canonical brand bundle.
// -----------------------------------------------------------------------------

const wordmarkSizeForMark = (markSize) => {
  if (markSize >= 96) return 'xl';
  if (markSize >= 64) return 'lg';
  if (markSize >= 36) return 'md';
  return 'sm';
};

const lockupOrientationClass = (orientation) =>
  orientation === 'stacked'
    ? 'flex-col items-center gap-3'
    : 'items-center gap-2';

// Map mark variant -> wordmark variant. Solid chip is paired with ink
// wordmark; outline mark uses brand-coloured wordmark for parity; mono
// pairs with mono.
const wordmarkVariantForMark = (markVariant) => {
  switch (markVariant) {
    case 'mono':
      return 'mono';
    case 'outline':
      return 'brand';
    case 'solid':
    default:
      return 'ink';
  }
};

export const LogoLockup = ({
  size = 40,
  variant = 'solid',
  orientation = 'horizontal',
  className,
}) => (
  <span
    className={cn('inline-flex', lockupOrientationClass(orientation), className)}
  >
    <LogoMark size={size} variant={variant} />
    <Wordmark
      size={wordmarkSizeForMark(size)}
      variant={wordmarkVariantForMark(variant)}
    />
  </span>
);

export default LogoMark;
