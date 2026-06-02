import { cn } from '@/lib/utils';

// Refined monogram: an "H" formed by two waveform-bar uprights with a tied
// crossbar. Scales with the parent (uses em units). The mark is drawn on a
// rounded-square chip so it reads well on the sidebar at 40px and on the
// title-card at 240px.

export const LogoMark = ({ size = 40, className, animated = false }) => (
  <span
    className={cn(
      'inline-flex items-center justify-center rounded-2xl shadow-elev-3 gradient-accent',
      className,
    )}
    style={{ width: size, height: size }}
    aria-hidden="true"
  >
    <svg
      viewBox="0 0 64 64"
      width={size * 0.6}
      height={size * 0.6}
      fill="none"
    >
      {/* Left bar */}
      <rect
        x="14"
        y="14"
        width="9"
        height="36"
        rx="4"
        fill="hsl(var(--track-accent-foreground))"
      >
        {animated ? (
          <animate
            attributeName="height"
            values="22;36;28;36"
            dur="2.4s"
            repeatCount="indefinite"
          />
        ) : null}
      </rect>
      {/* Right bar */}
      <rect
        x="41"
        y="14"
        width="9"
        height="36"
        rx="4"
        fill="hsl(var(--track-accent-foreground))"
      >
        {animated ? (
          <animate
            attributeName="height"
            values="36;22;30;22"
            dur="2.4s"
            repeatCount="indefinite"
          />
        ) : null}
      </rect>
      {/* Crossbar */}
      <rect
        x="23"
        y="28"
        width="18"
        height="8"
        rx="3"
        fill="hsl(var(--track-accent-foreground))"
        opacity="0.92"
      />
    </svg>
  </span>
);

export const Wordmark = ({ className, size = 'md' }) => {
  const cls =
    size === 'lg'
      ? 'text-display-md'
      : size === 'sm'
        ? 'text-base'
        : 'text-lg';
  return (
    <span
      className={cn(
        'font-display tracking-tighter-1 leading-none gradient-text font-normal italic',
        cls,
        className,
      )}
    >
      Harmony
    </span>
  );
};

export const LogoLockup = ({ size = 40, className }) => (
  <span className={cn('inline-flex items-center gap-2.5', className)}>
    <LogoMark size={size} />
    <Wordmark size="md" />
  </span>
);

export default LogoMark;
