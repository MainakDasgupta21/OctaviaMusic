import { cn } from '@/lib/utils';

// =============================================================================
// Octavia brand (v2 — premium and standard)
// -----------------------------------------------------------------------------
// One strong silhouette, one confident wordmark, one stable brand colour.
// Voice target: Apple Music / Tidal / Linear — restrained, geometric, premium.
//
// The mark is a filled "O" monogram drawn as a single evenodd path
// (outer circle minus inner counter). The counter is raised one unit toward
// the top, giving the bottom of the ring a hair more weight than the top —
// the optical correction that reads as "this is a real letterform, not a
// pixel-perfect ring".
//
// The chip uses a stable brand-orange gradient (`gradient-brand`) that does
// NOT track the playing accent. The brand stays consistent across the
// session; track colour stories live on hero gradients elsewhere.
//
// The wordmark is plain HTML — sans-serif renders crisper as native text and
// drops the SVG dependency for a piece of UI that doesn't need it.
//
// Variants:
//   - solid    chip + dark mark (default; used on sidebar, drawer, splash)
//   - outline  transparent chip with brand-stroke (light surfaces)
//   - mono     no chip, currentColor mark (404 and other restrained contexts)
// =============================================================================

const MARK_PATH =
  // Outer circle: center (32, 32), radius 23.
  'M 9 32 A 23 23 0 1 0 55 32 A 23 23 0 1 0 9 32 Z '
  // Inner counter: center (32, 31), radius 13.5 — raised 1 unit so the bottom
  // of the ring is a hair heavier than the top. Even-odd fill cuts it from
  // the outer circle to produce a clean donut.
  + 'M 18.5 31 A 13.5 13.5 0 1 0 45.5 31 A 13.5 13.5 0 1 0 18.5 31 Z';

const markVariantStyles = (variant) => {
  switch (variant) {
    case 'outline':
      return {
        chipFill: 'transparent',
        chipStroke: 'hsl(var(--brand-500))',
        chipStrokeWidth: 1.5,
        markFill: 'hsl(var(--brand-500))',
        chipClasses: '',
      };
    case 'mono':
      return {
        chipFill: 'transparent',
        chipStroke: 'transparent',
        chipStrokeWidth: 0,
        markFill: 'currentColor',
        chipClasses: '',
      };
    case 'solid':
    default:
      return {
        chipFill: null, // filled by the CSS class below for stable brand colour
        chipStroke: 'transparent',
        chipStrokeWidth: 0,
        markFill: 'hsl(var(--track-accent-foreground))',
        chipClasses: 'gradient-brand shadow-elev-3 rounded-2xl',
      };
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
        'relative inline-flex items-center justify-center select-none',
        styles.chipClasses,
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
        {/* Chip outline (outline/mono variants only). The solid chip is
            painted by the parent span via `gradient-brand` so the chip
            survives stacked masks and view transitions cleanly. */}
        {variant === 'outline' ? (
          <rect
            x="0.75"
            y="0.75"
            width="62.5"
            height="62.5"
            rx="14"
            fill="none"
            stroke={styles.chipStroke}
            strokeWidth={styles.chipStrokeWidth}
          />
        ) : null}

        {/* The O — filled donut with raised counter */}
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
