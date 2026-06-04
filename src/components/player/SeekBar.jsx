import { useEffect, useState } from 'react';
import { usePlayer, usePlayerProgress } from '@/contexts/PlayerContext';
import { useScrubPreview } from '@/hooks/use-scrub-preview';
import { formatTime } from '@/lib/player-format';
import { isReducedMotion } from '@/design/motion';
import { cn } from '@/lib/utils';

const pct = (value, total) =>
  total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;

// Custom progress bar (no Radix Slider): played vs buffered, a hover preview
// chip with absolute time + delta-from-current, and a smooth animated thumb.
// Click-to-seek and drag-to-scrub both run through useScrubPreview.
const SeekBar = () => {
  const { seekTo, playerRef, isPlaying } = usePlayer();
  const { progress, duration } = usePlayerProgress();
  const reduceMotion = isReducedMotion();

  const { isScrubbing, hover, displaySeconds, rootProps } = useScrubPreview({
    duration,
    progress,
    onSeek: seekTo,
    ariaLabel: 'Seek',
  });

  const hasDuration = Number.isFinite(duration) && duration > 0;

  // Poll the underlying media for how much has buffered. Works for the YT
  // backend (getVideoLoadedFraction) and falls back to a real <media>.buffered.
  const [buffered, setBuffered] = useState(0);
  useEffect(() => {
    if (!hasDuration) {
      setBuffered(0);
      return undefined;
    }
    const read = () => {
      const root = playerRef?.current;
      let seconds = 0;
      try {
        const yt =
          root?.api ||
          (typeof root?.getInternalPlayer === 'function'
            ? root.getInternalPlayer('youtube') || root.getInternalPlayer()
            : null);
        if (yt && typeof yt.getVideoLoadedFraction === 'function') {
          seconds = yt.getVideoLoadedFraction() * duration;
        } else if (root?.buffered?.length) {
          seconds = root.buffered.end(root.buffered.length - 1);
        }
      } catch {
        /* player not ready */
      }
      setBuffered((prev) => (Math.abs(prev - seconds) > 0.4 ? seconds : prev));
    };
    read();
    const id = setInterval(read, 1000);
    return () => clearInterval(id);
  }, [hasDuration, duration, playerRef]);

  const playedPct = pct(displaySeconds, duration);
  const bufferedPct = Math.max(playedPct, pct(buffered, duration));
  const hoverPct = hover ? Math.min(98, Math.max(2, hover.ratio * 100)) : 0;

  const animate = !isScrubbing && !reduceMotion;

  return (
    <div className="w-full select-none">
      <div
        {...rootProps}
        className={cn(
          'np-seek group relative w-full h-5 flex items-center cursor-pointer rounded-full focus-ring',
          isScrubbing && 'np-seek--scrubbing',
        )}
      >
        {hover && !isScrubbing ? (
          <div
            className="pointer-events-none absolute -top-9 z-10 -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${hoverPct}%` }}
          >
            <span className="rounded-sharp border border-white/15 bg-black/75 px-2 py-0.5 font-mono text-[10px] tracking-[0.06em] text-bone backdrop-blur-sm">
              {formatTime(hover.time)}
            </span>
          </div>
        ) : null}

        <div className="np-seek-track relative w-full h-[5px] rounded-full overflow-hidden">
          <span
            className="np-seek-buffer absolute inset-y-0 left-0 rounded-full"
            style={{ width: `${bufferedPct}%` }}
          />
          <span
            className={cn(
              'np-seek-played absolute inset-y-0 left-0 rounded-full',
              isPlaying && 'np-seek-played--live',
              animate && 'transition-[width] duration-150 ease-linear',
            )}
            style={{ width: `${playedPct}%` }}
          />
        </div>

        <span
          aria-hidden="true"
          className={cn(
            'np-seek-thumb absolute top-1/2 -translate-x-1/2 -translate-y-1/2',
            animate && 'transition-[left] duration-150 ease-linear',
            (isScrubbing || hover) && 'np-seek-thumb--active',
          )}
          style={{ left: `${playedPct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-ink-3 tabular-nums tracking-tight">
        <span>{formatTime(displaySeconds)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export default SeekBar;
