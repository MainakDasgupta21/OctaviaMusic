import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSettings } from '@/contexts/SettingsContext';

// Two contexts on purpose:
//  • PlayerContext        — stable state + controls. Changes only on real
//    actions (track change, play/pause, queue edits, volume…).
//  • PlayerProgressContext — the high-frequency playhead (fires several times a
//    second). Isolating it means the sidebar, nav, page grids and track cards
//    no longer re-render on every tick — only the few components that actually
//    paint the playhead subscribe to it.
const PlayerContext = createContext(undefined);
const PlayerProgressContext = createContext(undefined);

const STORAGE_KEY = 'harmony.player.v1';

const readState = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

const persisted = readState();

export const PlayerProvider = ({ children }) => {
  const { settings } = useSettings();

  const [currentTrack, setCurrentTrack] = useState(persisted?.currentTrack ?? null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(
    typeof persisted?.volume === 'number' ? persisted.volume : 0.7,
  );
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState(
    Array.isArray(persisted?.queue) ? persisted.queue : [],
  );
  const [history, setHistory] = useState(
    Array.isArray(persisted?.history) ? persisted.history : [],
  );
  const [shuffle, setShuffle] = useState(Boolean(persisted?.shuffle));
  const [repeat, setRepeat] = useState(
    ['off', 'all', 'one'].includes(persisted?.repeat) ? persisted.repeat : 'off',
  );
  const [isMuted, setIsMuted] = useState(false);

  const lastVolumeRef = useRef(volume || 0.7);
  const playerRef = useRef(null);
  const progressRef = useRef(0);

  // Persist a slim snapshot whenever durable bits change.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const snapshot = {
        currentTrack,
        volume,
        queue,
        history,
        shuffle,
        repeat,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      /* quota / private — ignore */
    }
  }, [currentTrack, volume, queue, history, shuffle, repeat]);

  const pushToHistory = useCallback((track) => {
    if (!track?.id) return;
    setHistory((h) => {
      const filtered = h.filter((t) => t.id !== track.id);
      return [track, ...filtered].slice(0, 24);
    });
  }, []);

  const playTrack = useCallback(
    (track) => {
      if (!track?.id) return;
      setCurrentTrack((prev) => {
        if (prev && prev.id !== track.id) pushToHistory(prev);
        return track;
      });
      setIsPlaying(true);
      setProgress(0);
      setDuration(0);
    },
    [pushToHistory],
  );

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    setIsPlaying((prev) => !prev);
  }, [currentTrack]);

  const setVolume = useCallback((vol) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setVolumeState(clamped);
    if (clamped > 0) {
      lastVolumeRef.current = clamped;
      setIsMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      if (prev) {
        const restore = lastVolumeRef.current || 0.7;
        setVolumeState(restore);
        return false;
      }
      lastVolumeRef.current = volume || lastVolumeRef.current || 0.7;
      setVolumeState(0);
      return true;
    });
  }, [volume]);

  const seekTo = useCallback((seconds) => {
    const media = playerRef.current;
    if (media) {
      try {
        media.currentTime = seconds;
      } catch {
        /* not ready */
      }
    }
    progressRef.current = seconds;
    setProgress(seconds);
  }, []);

  const addToQueue = useCallback((track) => {
    if (!track?.id) return;
    setQueue((prev) => [...prev, track]);
  }, []);

  // Insert a track at the head of the queue ("play next" context-menu action).
  const playTrackNext = useCallback((track) => {
    if (!track?.id) return;
    setQueue((prev) => [track, ...prev.filter((t) => t.id !== track.id)]);
  }, []);

  const clearQueue = useCallback(() => setQueue([]), []);

  const removeFromQueue = useCallback((id) => {
    setQueue((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const reorderQueue = useCallback((fromIdx, toIdx) => {
    setQueue((prev) => {
      if (fromIdx < 0 || toIdx < 0 || fromIdx >= prev.length || toIdx >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  // Real "next": consumes from the queue. If queue empty and repeat=all,
  // restart from the head of history. Honors shuffle.
  const playNext = useCallback(() => {
    setQueue((prevQueue) => {
      if (prevQueue.length > 0) {
        const nextIndex = shuffle
          ? Math.floor(Math.random() * prevQueue.length)
          : 0;
        const nextTrack = prevQueue[nextIndex];
        const remaining = prevQueue.filter((_, i) => i !== nextIndex);
        // Push the currently playing track into history before switching.
        setCurrentTrack((prevCurrent) => {
          if (prevCurrent && prevCurrent.id !== nextTrack.id) {
            pushToHistory(prevCurrent);
          }
          return nextTrack;
        });
        setIsPlaying(true);
        setProgress(0);
        setDuration(0);
        return remaining;
      }
      // Queue exhausted — repeat=all loops back through history.
      if (repeat === 'all') {
        setHistory((prevHistory) => {
          if (prevHistory.length === 0) return prevHistory;
          const nextTrack = prevHistory[prevHistory.length - 1];
          const remainingHistory = prevHistory.slice(0, -1);
          setCurrentTrack((prevCurrent) => {
            if (prevCurrent) {
              return nextTrack;
            }
            return nextTrack;
          });
          setIsPlaying(true);
          setProgress(0);
          setDuration(0);
          return remainingHistory;
        });
      }
      return prevQueue;
    });
  }, [shuffle, repeat, pushToHistory]);

  // Real "previous": if past 3s, restart current track; otherwise pop history.
  // Reads progress from a ref so the callback identity stays stable across
  // the many progress updates per second.
  const playPrevious = useCallback(() => {
    if (progressRef.current > 3) {
      const media = playerRef.current;
      if (media) {
        try {
          media.currentTime = 0;
        } catch {
          /* noop */
        }
      }
      progressRef.current = 0;
      setProgress(0);
      return;
    }
    setHistory((prevHistory) => {
      if (prevHistory.length === 0) {
        const media = playerRef.current;
        if (media) {
          try {
            media.currentTime = 0;
          } catch {
            /* noop */
          }
        }
        progressRef.current = 0;
        setProgress(0);
        return prevHistory;
      }
      const [previous, ...rest] = prevHistory;
      setCurrentTrack((prevCurrent) => {
        if (prevCurrent) {
          // Push the (now displaced) current track back onto the queue head
          // so "next" returns to it after going back.
          setQueue((q) => [prevCurrent, ...q]);
        }
        return previous;
      });
      setIsPlaying(true);
      progressRef.current = 0;
      setProgress(0);
      setDuration(0);
      return rest;
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle((prev) => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeat((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const reportProgress = useCallback((seconds) => {
    if (Number.isFinite(seconds)) {
      progressRef.current = seconds;
      setProgress(seconds);
    }
  }, []);

  const reportDuration = useCallback((seconds) => {
    if (Number.isFinite(seconds) && seconds > 0) setDuration(seconds);
  }, []);

  // Called by FooterPlayer's onEnded — encapsulates repeat / autoplay / queue.
  const handleTrackEnded = useCallback(() => {
    if (repeat === 'one') {
      seekTo(0);
      setIsPlaying(true);
      return;
    }
    if (queue.length > 0) {
      playNext();
      return;
    }
    if (repeat === 'all') {
      playNext();
      return;
    }
    if (settings?.autoplay && currentTrack) {
      // Autoplay fallback: replay current track if nothing else is queued.
      // A real implementation would request a similar track from the catalog.
      seekTo(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying(false);
  }, [repeat, queue.length, playNext, settings?.autoplay, currentTrack, seekTo]);

  // Stable slice — memoized so its identity only changes when one of these
  // durable values actually changes. Progress/duration are deliberately absent
  // so a playhead tick never invalidates this object.
  const value = useMemo(
    () => ({
      currentTrack,
      isPlaying,
      volume,
      isMuted,
      queue,
      history,
      shuffle,
      repeat,
      playTrack,
      togglePlay,
      setVolume,
      toggleMute,
      seekTo,
      addToQueue,
      playTrackNext,
      removeFromQueue,
      reorderQueue,
      clearQueue,
      playNext,
      playPrevious,
      toggleShuffle,
      toggleRepeat,
      handleTrackEnded,
      playerRef,
      reportProgress,
      reportDuration,
      canGoNext: queue.length > 0 || (repeat === 'all' && history.length > 0),
    }),
    [
      currentTrack,
      isPlaying,
      volume,
      isMuted,
      queue,
      history,
      shuffle,
      repeat,
      playTrack,
      togglePlay,
      setVolume,
      toggleMute,
      seekTo,
      addToQueue,
      playTrackNext,
      removeFromQueue,
      reorderQueue,
      clearQueue,
      playNext,
      playPrevious,
      toggleShuffle,
      toggleRepeat,
      handleTrackEnded,
      reportProgress,
      reportDuration,
    ],
  );

  // High-frequency slice. canGoPrevious lives here because it depends on
  // progress (>3s restarts the track); the only consumers of it also paint the
  // playhead, so they already subscribe to this context.
  const progressValue = useMemo(
    () => ({
      progress,
      duration,
      canGoPrevious: history.length > 0 || progress > 3,
    }),
    [progress, duration, history.length],
  );

  return (
    <PlayerContext.Provider value={value}>
      <PlayerProgressContext.Provider value={progressValue}>
        {children}
      </PlayerProgressContext.Provider>
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};

// Subscribe only to the playhead (progress / duration / canGoPrevious).
// Use this in components that paint the seek bar or sync to time so they
// re-render on each tick without dragging the rest of the tree along.
export const usePlayerProgress = () => {
  const context = useContext(PlayerProgressContext);
  if (!context) {
    throw new Error('usePlayerProgress must be used within a PlayerProvider');
  }
  return context;
};
