import { useCallback } from 'react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useSounds } from '@/contexts/SoundContext';

const safeVibrate = (ms) => {
  if (typeof navigator === 'undefined') return;
  if (typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(ms);
  } catch {
    /* not supported */
  }
};

// =============================================================================
// useTransportActions
// -----------------------------------------------------------------------------
// Shared behaviour for every transport surface in the app (FooterPlayer,
// TransportControls, mobile sheet, command palette). Centralises:
//   - sound-effects routing through SoundContext (which respects the
//     soundEffects setting + falls back to haptics on mobile)
//   - a haptic micro-burst on play/pause
//   - canonical aria-labels for every control state
// Each callback is stable across renders, so they can be passed directly to
// motion.button without extra memoisation.
// =============================================================================
export const useTransportActions = () => {
  const {
    isPlaying,
    togglePlay,
    playNext,
    playPrevious,
    canGoNext,
    canGoPrevious,
    shuffle,
    toggleShuffle,
    repeat,
    toggleRepeat,
  } = usePlayer();
  const { play: playSfx } = useSounds();

  const onTogglePlay = useCallback(() => {
    playSfx('pop');
    safeVibrate(8);
    togglePlay();
  }, [playSfx, togglePlay]);

  const onPlayNext = useCallback(() => {
    if (canGoNext) playSfx('click');
    playNext();
  }, [canGoNext, playSfx, playNext]);

  const onPlayPrevious = useCallback(() => {
    if (canGoPrevious) playSfx('click');
    playPrevious();
  }, [canGoPrevious, playSfx, playPrevious]);

  const onToggleShuffle = useCallback(() => {
    playSfx('tick');
    toggleShuffle();
  }, [playSfx, toggleShuffle]);

  const onToggleRepeat = useCallback(() => {
    playSfx('tick');
    toggleRepeat();
  }, [playSfx, toggleRepeat]);

  // Canonical labels — pulled into one place so screen readers don't get
  // subtly different strings on each surface.
  const labels = {
    play: isPlaying ? 'Pause' : 'Play',
    next: 'Next track',
    previous: 'Previous track',
    shuffle: shuffle ? 'Shuffle on' : 'Shuffle off',
    repeat:
      repeat === 'one'
        ? 'Repeat one'
        : repeat === 'all'
          ? 'Repeat all'
          : 'Repeat off',
  };

  return {
    isPlaying,
    shuffle,
    repeat,
    canGoNext,
    canGoPrevious,
    labels,
    onTogglePlay,
    onPlayNext,
    onPlayPrevious,
    onToggleShuffle,
    onToggleRepeat,
  };
};

export default useTransportActions;
