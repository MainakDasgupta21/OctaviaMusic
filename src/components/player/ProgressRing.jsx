import { useId, useMemo } from 'react';
import { useRadialScrub } from '@/hooks/use-radial-scrub';
import { cn } from '@/lib/utils';

// =============================================================================
// ProgressRing
// -----------------------------------------------------------------------------
// One stroke, one circle. The only progress UI in the player.
//
// Geometry — a single <circle r=DISC_R> inside a 100x100 viewBox.
// The sweep starts at 9 o'clock by default and advances clockwise as one
// contiguous dash segment. We keep a fixed, non-repeating dash pattern (`C C`)
// and move its leading edge using dashoffset:
//   filled = max(dotLen, p * C)
//   offset = C - filled
// where C is circumference and p is 0..1 progress ratio.
// At p=0 the linecap renders as a dot at the start point.
// At p=1 the dash equals C, so the circle is fully closed at the same 9 o'clock
// origin.
//
// Color — the stroke is a three-stop linearGradient pulling from the runtime
// --track-accent / --track-accent-2 / --track-accent-3 vars. The palette
// extractor lerps those values when the track changes, so the ring's colors
// flow organically between songs without any per-component animation. That
// is the "chameleon" — the ring picks up whatever palette the artwork emits.
//
// Glow — three layered drop-shadows: a tight rim glow, a mid bloom, a far
// halo wash. Subtly intensifies when `playing` is true.
//
// Interactivity — when `interactive` is true, the radial scrub hook converts
// pointer position around the ring into a 0..1 ratio and exposes a slim
// floating time chip near the leading edge. Keyboard arrows / Home / End
// match the linear seek bar's vocabulary.
// =============================================================================

const VIEW = 100;
const CENTER = VIEW / 2;
const DISC_R = 47;
const CIRCUMFERENCE = 2 * Math.PI * DISC_R;
const FULL_SWEEP_EPSILON = 0.001;

// SVG rotation that maps the default 3 o'clock start angle (atan = 0) onto
// the requested clock face position. Must be kept in sync with the scrub
// hook's `START_OFFSET_RAD` so pointer math agrees with visual sweep.
const SVG_ROTATE_DEG = {
  top: -90,
  left: 180,
};

// Angle (radians) added to `ratio * 2π` when computing the position of the
// stroke's leading edge (used by the floating time chip). At ratio = 0 the
// resulting point sits exactly on the chosen start position.
const POLAR_OFFSET_RAD = {
  top: -Math.PI / 2,
  left: Math.PI,
};

const polarFromRatio = (ratio, startAt = 'top') => {
  const r = Math.min(0.9999999, Math.max(0, ratio));
  const offset = POLAR_OFFSET_RAD[startAt] ?? POLAR_OFFSET_RAD.top;
  const angle = r * Math.PI * 2 + offset;
  return {
    x: CENTER + DISC_R * Math.cos(angle),
    y: CENTER + DISC_R * Math.sin(angle),
  };
};

const formatClock = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const ProgressRing = ({
  progress = 0,
  duration = 0,
  playing = false,
  interactive = false,
  onSeek,
  ariaLabel = 'Seek',
  size,
  thickness = 2.4,
  showTimeChip = true,
  bloom = false,
  // When true, render a faint full-circle "track" stroke behind the
  // colored progress stroke so the ring's footprint is visible even at
  // 0% progress (like a standard circular progress bar). The footer
  // mini-players opt out to keep the original "arc only" aesthetic.
  showTrack = false,
  startAt = 'left',
  className,
  innerClassName,
  children,
}) => {
  const gradId = useId();
  const hasDuration = Number.isFinite(duration) && duration > 0;
  const ratio = useMemo(() => {
    if (!hasDuration) return 0;
    const v = (Number.isFinite(progress) ? progress : 0) / duration;
    const clamped = Math.max(0, Math.min(1, v));
    return clamped >= 1 - FULL_SWEEP_EPSILON ? 1 : clamped;
  }, [progress, duration, hasDuration]);

  const { isScrubbing, hover, displaySeconds, rootProps } = useRadialScrub({
    duration,
    progress,
    onSeek,
    ariaLabel,
    enabled: interactive,
    startAt,
  });

  const effectiveRatio = useMemo(() => {
    if (!isScrubbing || !hasDuration) return ratio;
    const scrubbed = Math.max(0, Math.min(1, displaySeconds / duration));
    return scrubbed >= 1 - FULL_SWEEP_EPSILON ? 1 : scrubbed;
  }, [isScrubbing, hasDuration, ratio, displaySeconds, duration]);

  const strokeMetrics = useMemo(() => {
    if (!hasDuration) {
      return {
        dashArray: '0 0',
        dashOffset: 0,
      };
    }
    // Tiny non-zero dash length so progress at exactly 0 is still visible
    // as a circular dot (thanks to round linecaps).
    const dotLen = Math.max(0.01, thickness * 0.02);
    const filled = Math.max(dotLen, Math.min(CIRCUMFERENCE, effectiveRatio * CIRCUMFERENCE));
    return {
      dashArray: `${CIRCUMFERENCE} ${CIRCUMFERENCE}`,
      dashOffset: CIRCUMFERENCE - filled,
    };
  }, [hasDuration, effectiveRatio, thickness]);

  const svgRotateDeg = SVG_ROTATE_DEG[startAt] ?? SVG_ROTATE_DEG.top;

  // Position of the leading edge (where the stroke "head" currently sits),
  // used for the floating hover/scrub time chip. Always in % of the ring
  // wrapper so the chip moves with the ring at any size.
  const leadingPoint = useMemo(
    () =>
      polarFromRatio(
        isScrubbing || hover ? (hover?.ratio ?? effectiveRatio) : effectiveRatio,
        startAt,
      ),
    [isScrubbing, hover, effectiveRatio, startAt],
  );

  const wrapperStyle = useMemo(() => {
    const style = {};
    if (typeof size === 'number') {
      style.width = `${size}px`;
      style.height = `${size}px`;
    } else if (typeof size === 'string') {
      style.width = size;
      style.height = size;
    }
    style['--ring-thickness'] = `${thickness}`;
    return style;
  }, [size, thickness]);

  const chipVisible = interactive && showTimeChip && (isScrubbing || hover);
  const chipTime = isScrubbing ? displaySeconds : hover?.time ?? 0;

  return (
    <div
      className={cn(
        'np-ring relative aspect-square select-none',
        // `touch-none` only on the interactive ring so the surrounding
        // footer/page can still scroll when the pointer lives over a
        // visual-only thumbnail ring.
        interactive && 'cursor-pointer focus-ring rounded-full touch-none',
        isScrubbing && 'np-ring--scrubbing',
        className,
      )}
      data-playing={playing ? 'true' : 'false'}
      style={wrapperStyle}
      {...rootProps}
    >
      {bloom ? <div aria-hidden="true" className="np-ring-bloom" /> : null}
      <svg
        aria-hidden="true"
        className="np-ring-svg absolute inset-0 h-full w-full overflow-visible"
        viewBox={`0 0 ${VIEW} ${VIEW}`}
      >
        <defs>
          <linearGradient
            id={`np-ring-grad-${gradId}`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2={VIEW}
            y2={VIEW}
          >
            <stop offset="0%" stopColor="hsl(var(--track-accent))" />
            <stop offset="55%" stopColor="hsl(var(--track-accent-2))" />
            <stop offset="100%" stopColor="hsl(var(--track-accent-3))" />
          </linearGradient>
        </defs>
        <g transform={`rotate(${svgRotateDeg} ${CENTER} ${CENTER})`}>
          {showTrack ? (
            <circle
              className="np-ring-track"
              cx={CENTER}
              cy={CENTER}
              r={DISC_R}
              strokeWidth={thickness}
              fill="none"
            />
          ) : null}
          <circle
            className="np-ring-stroke"
            cx={CENTER}
            cy={CENTER}
            r={DISC_R}
            stroke={`url(#np-ring-grad-${gradId})`}
            strokeWidth={thickness}
            strokeLinecap="round"
            fill="none"
            style={{
              strokeDasharray: strokeMetrics.dashArray,
              strokeDashoffset: `${strokeMetrics.dashOffset}`,
            }}
          />
        </g>
      </svg>

      {chipVisible ? (
        <div
          className="np-ring-chip pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${(leadingPoint.x / VIEW) * 100}%`,
            top: `${(leadingPoint.y / VIEW) * 100}%`,
          }}
        >
          <span className="rounded-sharp border border-white/15 bg-black/72 px-2 py-0.5 font-mono text-[10px] tracking-[0.06em] text-bone backdrop-blur-sm">
            {formatClock(chipTime)}
          </span>
        </div>
      ) : null}

      {children ? (
        <div
          className={cn(
            'np-ring-core absolute inset-0 flex items-center justify-center',
            // Children are visual only — the wrapper owns drag/scrub on the
            // interactive variant, and in the FooterPlayer's non-interactive
            // variant the parent <button> picks up the click via bubbling.
            'pointer-events-none [&_*]:pointer-events-none',
            innerClassName,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
};

export default ProgressRing;
