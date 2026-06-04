import { useCallback, useMemo, useRef, useState } from 'react';

// =============================================================================
// useScrubPreview — owns all pointer/keyboard interaction for the custom seek
// bar so the visual component stays declarative.
//
// • Hover (no buttons)        → reports { ratio, time, delta } for the preview chip.
// • Pointer down + move       → drag-to-scrub (thumb tracks the finger 1:1).
// • Pointer up / cancel       → commits the seek via onSeek().
// • Click without drag        → click-to-seek (handled by the same down/up).
// • Keyboard (← → Home End)   → step seek; stops propagation so the global
//                               shortcut handler doesn't double-fire.
//
// Returns `rootProps` (role=slider + aria + handlers) to spread on the bar,
// plus the derived display state for rendering.
// =============================================================================

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const KEY_STEP = 5; // seconds, matches the global ←/→ shortcut

export const useScrubPreview = ({ duration, progress, onSeek, ariaLabel = 'Seek' } = {}) => {
  const barRef = useRef(null);
  const [hover, setHover] = useState(null); // { ratio, time, delta } | null
  const [dragRatio, setDragRatio] = useState(null); // 0..1 while scrubbing | null
  const isScrubbing = dragRatio != null;

  const hasDuration = Number.isFinite(duration) && duration > 0;

  const ratioFromClientX = useCallback((clientX) => {
    const el = barRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (!rect.width) return null;
    return clamp01((clientX - rect.left) / rect.width);
  }, []);

  const commitSeek = useCallback(
    (ratio) => {
      if (!hasDuration || ratio == null) return;
      onSeek?.(ratio * duration);
    },
    [hasDuration, duration, onSeek],
  );

  const onPointerDown = useCallback(
    (event) => {
      if (!hasDuration) return;
      const ratio = ratioFromClientX(event.clientX);
      if (ratio == null) return;
      event.preventDefault();
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        /* capture unsupported */
      }
      setDragRatio(ratio);
    },
    [hasDuration, ratioFromClientX],
  );

  const onPointerMove = useCallback(
    (event) => {
      if (!hasDuration) return;
      const ratio = ratioFromClientX(event.clientX);
      if (ratio == null) return;
      if (dragRatio != null) {
        setDragRatio(ratio);
        return;
      }
      setHover({
        ratio,
        time: ratio * duration,
        delta: ratio * duration - (progress || 0),
      });
    },
    [hasDuration, ratioFromClientX, dragRatio, duration, progress],
  );

  const endScrub = useCallback(
    (event) => {
      if (dragRatio == null) return;
      commitSeek(dragRatio);
      try {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      } catch {
        /* noop */
      }
      setDragRatio(null);
    },
    [dragRatio, commitSeek],
  );

  const onPointerLeave = useCallback(() => {
    if (dragRatio == null) setHover(null);
  }, [dragRatio]);

  const onKeyDown = useCallback(
    (event) => {
      if (!hasDuration) return;
      // Let modifier combos (e.g. Shift+Arrow = prev/next) reach the global
      // shortcut handler instead of seeking.
      if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
      const cur = progress || 0;
      let next = null;
      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          next = Math.max(0, cur - KEY_STEP);
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          next = Math.min(duration, cur + KEY_STEP);
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = duration;
          break;
        default:
          return;
      }
      // Keep the focused slider authoritative; the window-level shortcut would
      // otherwise also seek and double the step.
      event.preventDefault();
      event.stopPropagation();
      onSeek?.(next);
    },
    [hasDuration, progress, duration, onSeek],
  );

  const displaySeconds = useMemo(() => {
    if (dragRatio != null && hasDuration) return dragRatio * duration;
    return progress || 0;
  }, [dragRatio, hasDuration, duration, progress]);

  const valueNow = Math.round(displaySeconds);

  const rootProps = useMemo(
    () => ({
      ref: barRef,
      role: 'slider',
      tabIndex: 0,
      'aria-label': ariaLabel,
      'aria-valuemin': 0,
      'aria-valuemax': hasDuration ? Math.round(duration) : 0,
      'aria-valuenow': valueNow,
      'aria-valuetext': `${formatClock(displaySeconds)} of ${formatClock(duration)}`,
      onPointerDown,
      onPointerMove,
      onPointerUp: endScrub,
      onPointerCancel: endScrub,
      onPointerLeave,
      onKeyDown,
    }),
    [
      ariaLabel,
      hasDuration,
      duration,
      valueNow,
      displaySeconds,
      onPointerDown,
      onPointerMove,
      endScrub,
      onPointerLeave,
      onKeyDown,
    ],
  );

  return { barRef, isScrubbing, hover, displaySeconds, rootProps };
};

// Tiny local clock for aria-valuetext (kept here so the hook has no UI deps).
const formatClock = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};
