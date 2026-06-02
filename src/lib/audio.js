// Crossfade helper. We can't crossfade YouTube iframes (separate audio pipeline,
// no access to the element), but we DO control ReactPlayer's `volume` prop. So:
// during the last `crossfadeSeconds` of the current track we fade its volume
// toward 0 while the next track preloads via the queue head. When the next
// track starts, we ramp its volume back up to the user-set target.
//
// Returns a controller with: `armEnd(durationSec, fadeSec)` and `armStart(fadeSec)`.
// FooterPlayer calls these from `onProgress` / `onPlay`.

export const createCrossfadeController = ({
  targetVolume = 0.7,
  onVolumeChange,
  reduceTo = 0,
} = {}) => {
  let raf = 0;
  let armed = false;

  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const ramp = (fromVol, toVol, durationMs, onDone) => {
    stop();
    const start = performance.now();
    const tick = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / Math.max(50, durationMs));
      const v = fromVol + (toVol - fromVol) * t;
      onVolumeChange?.(v);
      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        stop();
        onDone?.();
      }
    };
    raf = requestAnimationFrame(tick);
  };

  return {
    // Call on each progress tick. When we're inside the fade window, start fading.
    tick({ progress, duration, fadeSec, currentVolume }) {
      if (!fadeSec || fadeSec <= 0 || !duration || armed) return;
      const remaining = duration - progress;
      if (remaining <= fadeSec) {
        armed = true;
        ramp(currentVolume, reduceTo, remaining * 1000);
      }
    },
    // Call when a track starts.
    armStart(fadeSec) {
      armed = false;
      if (!fadeSec || fadeSec <= 0) {
        onVolumeChange?.(targetVolume);
        return;
      }
      ramp(0, targetVolume, fadeSec * 1000);
    },
    // Call when a new target volume is set externally.
    setTarget(v) {
      targetVolume = v;
    },
    dispose() {
      stop();
    },
  };
};
