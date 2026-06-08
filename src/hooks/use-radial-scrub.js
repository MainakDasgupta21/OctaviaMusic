import { useCallback, useMemo, useRef, useState } from 'react';

// =============================================================================
// useRadialScrub — pointer + keyboard interaction for a circular progress
// ring. Converts pointer position around the ring's geometric center into a
// 0..1 ratio that grows clockwise from a configurable start position.
//
//   ratio = ((atan2(dy, dx) + startOffsetRad + 2π) % 2π) / 2π
//
// `startAt='left'` (default) puts 0 at 9 o'clock (left → 0, top → 0.25,
// right → 0.5, bottom → 0.75). `startAt='top'` keeps the legacy 12 o'clock
// start (above → 0, right → 0.25, below → 0.5, left → 0.75). The offset must mirror the
// SVG ring's rotation so visual sweep and pointer math always agree. The
// returned `rootProps` carry `role="slider"` + aria so the ring is a fully
// accessible seek control for keyboard and screen-reader users.
// =============================================================================

const TAU = Math.PI * 2;
const clamp01 = (n) => Math.min(1, Math.max(0, n));
const KEY_STEP = 5;

// atan2 returns -π/2 for "above center" and +π for "left of center", so we
// add the inverse offset to make the chosen start position evaluate to 0.
const START_OFFSET_RAD = {
  top: Math.PI / 2,
  left: Math.PI,
};

const ratioFromPoint = (rect, clientX, clientY, startOffsetRad) => {
  if (!rect || !rect.width || !rect.height) return null;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  if (dx === 0 && dy === 0) return 0;
  const a = Math.atan2(dy, dx) + startOffsetRad;
  const norm = ((a % TAU) + TAU) % TAU;
  return clamp01(norm / TAU);
};

// Shortest-path step around the dial — keeps a half-revolution drag from
// flipping 0.99 → 0.01 if the pointer crosses 12 o'clock by a hair.
const reconcileRatio = (prev, next) => {
  if (prev == null) return next;
  const delta = next - prev;
  if (Math.abs(delta) > 0.5) {
    return delta > 0 ? next - 1 : next + 1;
  }
  return next;
};

export const useRadialScrub = ({
  duration,
  progress,
  onSeek,
  ariaLabel = 'Seek',
  enabled = true,
  startAt = 'left',
} = {}) => {
  const ringRef = useRef(null);
  const rawPrevRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [dragRatio, setDragRatio] = useState(null);
  const isScrubbing = dragRatio != null;

  const hasDuration = Number.isFinite(duration) && duration > 0;
  const interactive = enabled && hasDuration;
  const startOffsetRad = START_OFFSET_RAD[startAt] ?? START_OFFSET_RAD.top;

  const computeRatio = useCallback(
    (clientX, clientY) => {
      const el = ringRef.current;
      if (!el) return null;
      return ratioFromPoint(el.getBoundingClientRect(), clientX, clientY, startOffsetRad);
    },
    [startOffsetRad],
  );

  const commitSeek = useCallback(
    (ratio) => {
      if (!hasDuration || ratio == null) return;
      onSeek?.(clamp01(ratio) * duration);
    },
    [hasDuration, duration, onSeek],
  );

  const onPointerDown = useCallback(
    (event) => {
      if (!interactive) return;
      const r = computeRatio(event.clientX, event.clientY);
      if (r == null) return;
      event.preventDefault();
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      } catch {
        /* capture unsupported */
      }
      rawPrevRef.current = r;
      setDragRatio(r);
    },
    [interactive, computeRatio],
  );

  const onPointerMove = useCallback(
    (event) => {
      if (!interactive) return;
      const raw = computeRatio(event.clientX, event.clientY);
      if (raw == null) return;
      if (dragRatio != null) {
        const reconciled = reconcileRatio(rawPrevRef.current, raw);
        rawPrevRef.current = raw;
        setDragRatio(clamp01(reconciled));
        return;
      }
      setHover({
        ratio: raw,
        time: raw * duration,
        delta: raw * duration - (progress || 0),
      });
    },
    [interactive, computeRatio, dragRatio, duration, progress],
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
      rawPrevRef.current = null;
      setDragRatio(null);
    },
    [dragRatio, commitSeek],
  );

  const onPointerLeave = useCallback(() => {
    if (dragRatio == null) setHover(null);
  }, [dragRatio]);

  const onKeyDown = useCallback(
    (event) => {
      if (!interactive) return;
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
      event.preventDefault();
      event.stopPropagation();
      onSeek?.(next);
    },
    [interactive, progress, duration, onSeek],
  );

  const displaySeconds = useMemo(() => {
    if (dragRatio != null && hasDuration) return dragRatio * duration;
    return progress || 0;
  }, [dragRatio, hasDuration, duration, progress]);

  const valueNow = Math.round(displaySeconds);

  const rootProps = useMemo(
    () => ({
      ref: ringRef,
      role: interactive ? 'slider' : undefined,
      tabIndex: interactive ? 0 : undefined,
      'aria-label': interactive ? ariaLabel : undefined,
      'aria-valuemin': interactive ? 0 : undefined,
      'aria-valuemax': interactive && hasDuration ? Math.round(duration) : undefined,
      'aria-valuenow': interactive ? valueNow : undefined,
      'aria-valuetext': interactive
        ? `${formatClock(displaySeconds)} of ${formatClock(duration)}`
        : undefined,
      onPointerDown: interactive ? onPointerDown : undefined,
      onPointerMove: interactive ? onPointerMove : undefined,
      onPointerUp: interactive ? endScrub : undefined,
      onPointerCancel: interactive ? endScrub : undefined,
      onPointerLeave: interactive ? onPointerLeave : undefined,
      onKeyDown: interactive ? onKeyDown : undefined,
    }),
    [
      interactive,
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

  return { ringRef, isScrubbing, hover, displaySeconds, rootProps };
};

const formatClock = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default useRadialScrub;
