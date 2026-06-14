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
import { useAuth } from '@/contexts/AuthContext';
import { getExploreRadio, getExploreSimilar } from '@/lib/api';
import api from '@/lib/api';
import { sanitizeTrack, sanitizeTrackList } from '@/lib/media-sanitize';
import { buildSmartQueueFromSeed } from '@/lib/smart-queue';

// Two contexts on purpose:
//  • PlayerContext         — durable playback/queue state + controls.
//  • PlayerProgressContext — high-frequency playhead values.
const PlayerContext = createContext(undefined);
const PlayerProgressContext = createContext(undefined);

const STORAGE_KEY = 'octavia.player.v1';
const HISTORY_MAX = 20;
const SMART_QUEUE_LIMIT = 24;
const SMART_REMOTE_LIMIT = 30;
// Seconds into a track past which "previous" restarts the current song rather
// than skipping to the prior one. Used by playPrevious + the canGoPrevious flag.
const PREV_RESTART_THRESHOLD = 3;

const normalizeQueueMode = (value) =>
  ['manual', 'collection', 'smart'].includes(value) ? value : 'manual';

const clampIndex = (value, max) => {
  if (!Number.isInteger(value)) return 0;
  if (max < 0) return -1;
  return Math.max(0, Math.min(value, max));
};

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

const sanitizePersistedState = (state) => {
  if (!state || typeof state !== 'object') return null;
  const currentTrack = sanitizeTrack(state.currentTrack, { requirePlayable: true });
  let queue = sanitizeTrackList(state.queue, { requirePlayable: true });
  let queueIndex = Number.isInteger(state.queueIndex) ? state.queueIndex : -1;

  if (currentTrack) {
    const existingIndex = queue.findIndex((row) => row.id === currentTrack.id);
    if (existingIndex >= 0) {
      queueIndex = existingIndex;
    } else if (queue.length > 0) {
      // Backward compatibility for the old "up-next only" queue shape.
      queue = [currentTrack, ...queue];
      queueIndex = 0;
    } else {
      queue = [currentTrack];
      queueIndex = 0;
    }
  } else if (queue.length > 0) {
    queueIndex = clampIndex(queueIndex, queue.length - 1);
  } else {
    queueIndex = -1;
  }

  return {
    currentTrack,
    volume: typeof state.volume === 'number' ? state.volume : 0.7,
    queue,
    queueIndex,
    queueMode: normalizeQueueMode(state.queueMode),
    history: [],
    shuffle: Boolean(state.shuffle),
    repeat: ['off', 'all', 'one'].includes(state.repeat) ? state.repeat : 'off',
  };
};

const persisted = sanitizePersistedState(readState());

const ensureCurrentInQueue = (queueState, currentTrack) => {
  const tracks = Array.isArray(queueState?.tracks) ? [...queueState.tracks] : [];
  const currentIndex = Number.isInteger(queueState?.currentIndex) ? queueState.currentIndex : -1;
  if (!currentTrack?.id) {
    return {
      tracks,
      currentIndex: tracks.length ? clampIndex(currentIndex, tracks.length - 1) : -1,
    };
  }

  if (tracks.length === 0) {
    return { tracks: [currentTrack], currentIndex: 0 };
  }

  if (currentIndex >= 0 && tracks[currentIndex]?.id === currentTrack.id) {
    return { tracks, currentIndex };
  }

  const found = tracks.findIndex((track) => track.id === currentTrack.id);
  if (found >= 0) return { tracks, currentIndex: found };

  tracks.unshift(currentTrack);
  return { tracks, currentIndex: 0 };
};

const resolveNextIndex = ({ queueLength, currentIndex, shuffle, repeat }) => {
  if (queueLength <= 0 || currentIndex < 0) return null;
  if (shuffle && queueLength > 1) {
    const pool = [];
    for (let index = 0; index < queueLength; index += 1) {
      if (index === currentIndex) continue;
      if (repeat !== 'all' && index < currentIndex) continue;
      pool.push(index);
    }
    if (pool.length === 0 && repeat === 'all') {
      for (let index = 0; index < queueLength; index += 1) {
        if (index !== currentIndex) pool.push(index);
      }
    }
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  if (currentIndex < queueLength - 1) return currentIndex + 1;
  if (repeat === 'all') return 0;
  return null;
};

export const PlayerProvider = ({ children }) => {
  const { settings } = useSettings();
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);

  const [currentTrack, setCurrentTrack] = useState(persisted?.currentTrack ?? null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(persisted?.volume ?? 0.7);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queueState, setQueueState] = useState({
    tracks: Array.isArray(persisted?.queue) ? persisted.queue : [],
    currentIndex: Number.isInteger(persisted?.queueIndex) ? persisted.queueIndex : -1,
    queueMode: normalizeQueueMode(persisted?.queueMode),
  });
  const [history, setHistory] = useState([]);
  const [shuffle, setShuffle] = useState(Boolean(persisted?.shuffle));
  const [repeat, setRepeat] = useState(persisted?.repeat || 'off');
  const [isMuted, setIsMuted] = useState(false);

  const queue = queueState.tracks;
  const queueIndex = queueState.currentIndex;
  const queueMode = queueState.queueMode;

  const lastVolumeRef = useRef(volume || 0.7);
  const playerRef = useRef(null);
  const progressRef = useRef(0);
  // Holds a pending requestAnimationFrame id so high-frequency playhead ticks
  // collapse into at most one React state update per frame (see reportProgress).
  const progressRafRef = useRef(null);
  // "Played past the restart threshold" — drives canGoPrevious. Kept as a
  // coarse boolean (flips only when crossing PREV_RESTART_THRESHOLD) so it lives
  // on the durable PlayerContext instead of the per-tick progress slice. This
  // stops every transport surface from re-rendering on each playhead tick.
  const pastPrevThresholdRef = useRef(false);
  const [pastPrevThreshold, setPastPrevThreshold] = useState(false);

  const syncPrevThreshold = useCallback((seconds) => {
    const next = Number.isFinite(seconds) && seconds > PREV_RESTART_THRESHOLD;
    if (next !== pastPrevThresholdRef.current) {
      pastPrevThresholdRef.current = next;
      setPastPrevThreshold(next);
    }
  }, []);
  const currentTrackRef = useRef(currentTrack);
  const queueStateRef = useRef(queueState);
  const smartQueueRequestRef = useRef(0);
  const historySyncUserRef = useRef(null);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    queueStateRef.current = queueState;
  }, [queueState]);

  useEffect(() => {
    if (!isAuthenticated) {
      historySyncUserRef.current = null;
      setHistory([]);
      return;
    }

    const userId = user?.id || user?._id;
    if (!userId || historySyncUserRef.current === userId) return;

    let active = true;
    const syncHistoryFromServer = async () => {
      try {
        const fresh = await api.get('/me/history', { params: { limit: HISTORY_MAX } });
        if (!active) return;
        const merged = sanitizeTrackList(fresh.data?.items || [], {
          requirePlayable: true,
        }).slice(0, HISTORY_MAX);
        setHistory(merged);
      } catch {
        // History sync is best-effort; playback should not fail if network is down.
      } finally {
        historySyncUserRef.current = userId;
      }
    };

    void syncHistoryFromServer();

    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.id, user?._id]);

  // Persist a slim snapshot whenever durable bits change.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const snapshot = {
        currentTrack,
        volume,
        queue,
        queueIndex,
        queueMode,
        shuffle,
        repeat,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      /* storage unavailable */
    }
  }, [currentTrack, volume, queue, queueIndex, queueMode, shuffle, repeat]);

  const invalidateSmartQueueRequests = useCallback(() => {
    smartQueueRequestRef.current += 1;
  }, []);

  const pushToHistory = useCallback((trackInput) => {
    const track = sanitizeTrack(trackInput, { requirePlayable: true });
    if (!track?.id) return;
    setHistory((rows) => {
      const filtered = rows.filter((row) => row.id !== track.id);
      return [track, ...filtered].slice(0, HISTORY_MAX);
    });
    if (isAuthenticated) {
      void api.post('/me/history', { track }).catch(() => {});
    }
  }, [isAuthenticated]);

  const startTrackPlayback = useCallback((trackInput) => {
    const track = sanitizeTrack(trackInput, { requirePlayable: true });
    if (!track?.id) return null;
    setCurrentTrack((previous) => {
      if (previous && previous.id !== track.id) pushToHistory(previous);
      return track;
    });
    setIsPlaying(true);
    progressRef.current = 0;
    syncPrevThreshold(0);
    setProgress(0);
    setDuration(0);
    return track;
  }, [pushToHistory, syncPrevThreshold]);

  const generateSmartQueue = useCallback(async (seedTrackInput, { localCandidates = [] } = {}) => {
    const seedTrack = sanitizeTrack(seedTrackInput, { requirePlayable: true });
    if (!seedTrack?.id) return;

    const requestId = smartQueueRequestRef.current + 1;
    smartQueueRequestRef.current = requestId;

    const seedKey = seedTrack.videoId || seedTrack.id || `${seedTrack.title || ''} ${seedTrack.artist || ''}`.trim();
    const [similarResponse, radioResponse] = await Promise.allSettled([
      getExploreSimilar({
        trackId: seedTrack.id || seedTrack.videoId || seedKey,
        limit: SMART_REMOTE_LIMIT,
      }),
      getExploreRadio({
        mood: '',
        genre: Array.isArray(seedTrack.genre) ? seedTrack.genre[0] || '' : seedTrack.genre || '',
        seed: seedKey,
        diversity: 'high',
        limit: SMART_REMOTE_LIMIT,
      }),
    ]);

    if (requestId !== smartQueueRequestRef.current) return;

    const similarItems = similarResponse.status === 'fulfilled'
      ? (Array.isArray(similarResponse.value?.items) ? similarResponse.value.items : similarResponse.value || [])
      : [];
    const radioItems = radioResponse.status === 'fulfilled'
      ? (Array.isArray(radioResponse.value?.items) ? radioResponse.value.items : radioResponse.value || [])
      : [];

    const recommendations = buildSmartQueueFromSeed({
      seedTrack,
      remoteCandidates: [...similarItems, ...radioItems],
      localCandidates,
      history,
      limit: SMART_QUEUE_LIMIT,
    });
    if (!recommendations.length) return;

    setQueueState((previous) => {
      if (previous.queueMode !== 'smart') return previous;
      const active = previous.tracks[previous.currentIndex];
      if (!active || active.id !== seedTrack.id) return previous;
      const seen = new Set(previous.tracks.map((track) => track.id));
      const additions = recommendations.filter((track) => !seen.has(track.id));
      if (!additions.length) return previous;
      return { ...previous, tracks: [...previous.tracks, ...additions] };
    });
  }, [history]);

  const playTrack = useCallback((trackInput, options = {}) => {
    const track = sanitizeTrack(trackInput, { requirePlayable: true });
    if (!track?.id) return false;

    const queueBehavior = options.queueBehavior || 'smart';
    if (queueBehavior === 'queue') {
      invalidateSmartQueueRequests();
      setQueueState((previous) => {
        let nextTracks = previous.tracks;
        let nextIndex = -1;

        if (
          Number.isInteger(options.queueIndex)
          && previous.tracks[options.queueIndex]?.id === track.id
        ) {
          nextIndex = options.queueIndex;
        } else {
          nextIndex = previous.tracks.findIndex((row) => row.id === track.id);
        }

        if (nextIndex < 0) {
          nextTracks = [...previous.tracks, track];
          nextIndex = nextTracks.length - 1;
        }

        return {
          ...previous,
          tracks: nextTracks,
          currentIndex: nextIndex,
        };
      });
      return Boolean(startTrackPlayback(track));
    }

    if (queueBehavior === 'preserve') {
      invalidateSmartQueueRequests();
      setQueueState((previous) => {
        const existingIndex = previous.tracks.findIndex((row) => row.id === track.id);
        if (existingIndex >= 0) {
          return { ...previous, currentIndex: existingIndex };
        }
        const { tracks, currentIndex } = ensureCurrentInQueue(previous, currentTrackRef.current);
        const insertAt = Math.max(0, currentIndex + 1);
        const nextTracks = [...tracks];
        nextTracks.splice(insertAt, 0, track);
        return {
          ...previous,
          tracks: nextTracks,
          currentIndex: insertAt,
          queueMode: 'manual',
        };
      });
      return Boolean(startTrackPlayback(track));
    }

    // Default single-track behaviour: start playback immediately and then build
    // a smart "up next" queue around the seed in the background.
    const localCandidates = [...queueStateRef.current.tracks, ...history];
    setQueueState({
      tracks: [track],
      currentIndex: 0,
      queueMode: 'smart',
    });
    const didStart = Boolean(startTrackPlayback(track));
    if (didStart) {
      void generateSmartQueue(track, { localCandidates });
    }
    return didStart;
  }, [generateSmartQueue, history, invalidateSmartQueueRequests, startTrackPlayback]);

  const togglePlay = useCallback(() => {
    if (!currentTrackRef.current) return;
    setIsPlaying((previous) => !previous);
  }, []);

  const setVolume = useCallback((nextVolume) => {
    const clamped = Math.max(0, Math.min(1, nextVolume));
    setVolumeState(clamped);
    if (clamped > 0) {
      lastVolumeRef.current = clamped;
      setIsMuted(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((previous) => {
      if (previous) {
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
        /* media not ready */
      }
    }
    progressRef.current = seconds;
    syncPrevThreshold(seconds);
    setProgress(seconds);
  }, [syncPrevThreshold]);

  const addToQueue = useCallback((trackInput) => {
    const track = sanitizeTrack(trackInput, { requirePlayable: true });
    if (!track?.id) return;
    invalidateSmartQueueRequests();
    setQueueState((previous) => {
      const { tracks, currentIndex } = ensureCurrentInQueue(previous, currentTrackRef.current);
      return {
        ...previous,
        tracks: [...tracks, track],
        currentIndex,
        queueMode: previous.queueMode === 'collection' ? 'collection' : 'manual',
      };
    });
  }, [invalidateSmartQueueRequests]);

  const playTracksInOrder = useCallback(
    (tracks, { replaceQueue = true, startIndex = 0, forceSequential = false } = {}) => {
      const ordered = sanitizeTrackList(tracks, { requirePlayable: true });
      if (!ordered.length) return false;
      invalidateSmartQueueRequests();

      const boundedStart = clampIndex(startIndex, ordered.length - 1);
      const first = ordered[boundedStart];
      if (replaceQueue) {
        setQueueState({
          tracks: ordered,
          currentIndex: boundedStart,
          queueMode: 'collection',
        });
      } else {
        setQueueState((previous) => {
          const offset = previous.tracks.length;
          return {
            ...previous,
            tracks: [...previous.tracks, ...ordered],
            currentIndex: offset + boundedStart,
            queueMode: 'manual',
          };
        });
      }
      if (forceSequential) setShuffle(false);
      return Boolean(startTrackPlayback(first));
    },
    [invalidateSmartQueueRequests, startTrackPlayback],
  );

  // Inserts a track right after the currently playing track.
  const playTrackNext = useCallback((trackInput) => {
    const track = sanitizeTrack(trackInput, { requirePlayable: true });
    if (!track?.id) return;
    invalidateSmartQueueRequests();
    setQueueState((previous) => {
      const { tracks, currentIndex } = ensureCurrentInQueue(previous, currentTrackRef.current);
      const insertAt = Math.min(tracks.length, Math.max(0, currentIndex + 1));
      const withoutDuplicate = tracks.filter(
        (row, index) => index === currentIndex || row.id !== track.id,
      );
      const nextTracks = [...withoutDuplicate];
      nextTracks.splice(insertAt, 0, track);
      return {
        ...previous,
        tracks: nextTracks,
        currentIndex,
        queueMode: 'manual',
      };
    });
  }, [invalidateSmartQueueRequests]);

  const clearQueue = useCallback(() => {
    invalidateSmartQueueRequests();
    const active = currentTrackRef.current;
    if (active) {
      setQueueState({
        tracks: [active],
        currentIndex: 0,
        queueMode: 'manual',
      });
      return;
    }
    setQueueState({
      tracks: [],
      currentIndex: -1,
      queueMode: 'manual',
    });
  }, [invalidateSmartQueueRequests]);

  const removeFromQueueAt = useCallback((index) => {
    setQueueState((previous) => {
      if (!Number.isInteger(index)) return previous;
      if (index < 0 || index >= previous.tracks.length) return previous;
      if (index === previous.currentIndex) return previous;
      const nextTracks = previous.tracks.filter((_, rowIndex) => rowIndex !== index);
      if (!nextTracks.length) {
        return { ...previous, tracks: [], currentIndex: -1, queueMode: 'manual' };
      }
      const nextIndex =
        index < previous.currentIndex
          ? previous.currentIndex - 1
          : previous.currentIndex;
      return {
        ...previous,
        tracks: nextTracks,
        currentIndex: clampIndex(nextIndex, nextTracks.length - 1),
        queueMode: 'manual',
      };
    });
  }, []);

  const removeFromQueue = useCallback((id) => {
    if (!id) return;
    setQueueState((previous) => {
      const removeIndex = previous.tracks.findIndex((row) => row.id === id);
      if (removeIndex < 0) return previous;
      if (removeIndex === previous.currentIndex) return previous;
      const nextTracks = previous.tracks.filter((_, index) => index !== removeIndex);
      if (!nextTracks.length) {
        return { ...previous, tracks: [], currentIndex: -1, queueMode: 'manual' };
      }
      const nextIndex =
        removeIndex < previous.currentIndex
          ? previous.currentIndex - 1
          : previous.currentIndex;
      return {
        ...previous,
        tracks: nextTracks,
        currentIndex: clampIndex(nextIndex, nextTracks.length - 1),
        queueMode: 'manual',
      };
    });
  }, []);

  const reorderQueue = useCallback((fromIdx, toIdx) => {
    setQueueState((previous) => {
      if (
        fromIdx < 0
        || toIdx < 0
        || fromIdx >= previous.tracks.length
        || toIdx >= previous.tracks.length
        || fromIdx === toIdx
      ) {
        return previous;
      }
      const nextTracks = [...previous.tracks];
      const [moved] = nextTracks.splice(fromIdx, 1);
      nextTracks.splice(toIdx, 0, moved);

      let nextIndex = previous.currentIndex;
      if (fromIdx === previous.currentIndex) {
        nextIndex = toIdx;
      } else if (fromIdx < previous.currentIndex && toIdx >= previous.currentIndex) {
        nextIndex = previous.currentIndex - 1;
      } else if (fromIdx > previous.currentIndex && toIdx <= previous.currentIndex) {
        nextIndex = previous.currentIndex + 1;
      }

      return {
        ...previous,
        tracks: nextTracks,
        currentIndex: clampIndex(nextIndex, nextTracks.length - 1),
        queueMode: 'manual',
      };
    });
  }, []);

  const playNext = useCallback(() => {
    const snapshot = queueStateRef.current;
    const nextIndex = resolveNextIndex({
      queueLength: snapshot.tracks.length,
      currentIndex: snapshot.currentIndex,
      shuffle,
      repeat,
    });
    if (nextIndex == null) return false;
    const nextTrack = snapshot.tracks[nextIndex];
    if (!nextTrack) return false;

    setQueueState((previous) => ({ ...previous, currentIndex: nextIndex }));
    return Boolean(startTrackPlayback(nextTrack));
  }, [shuffle, repeat, startTrackPlayback]);

  const playPrevious = useCallback(() => {
    if (progressRef.current > PREV_RESTART_THRESHOLD) {
      const media = playerRef.current;
      if (media) {
        try {
          media.currentTime = 0;
        } catch {
          /* media not ready */
        }
      }
      progressRef.current = 0;
      syncPrevThreshold(0);
      setProgress(0);
      return true;
    }

    const snapshot = queueStateRef.current;
    if (snapshot.tracks.length > 0) {
      let previousIndex = null;
      if (snapshot.currentIndex > 0) {
        previousIndex = snapshot.currentIndex - 1;
      } else if (repeat === 'all' && snapshot.tracks.length > 1) {
        previousIndex = snapshot.tracks.length - 1;
      }
      if (previousIndex != null) {
        const previousTrack = snapshot.tracks[previousIndex];
        if (previousTrack) {
          setQueueState((previous) => ({ ...previous, currentIndex: previousIndex }));
          return Boolean(startTrackPlayback(previousTrack));
        }
      }
    }

    // No earlier queue entry — restart current.
    const media = playerRef.current;
    if (media) {
      try {
        media.currentTime = 0;
      } catch {
        /* media not ready */
      }
    }
    progressRef.current = 0;
    syncPrevThreshold(0);
    setProgress(0);
    return false;
  }, [repeat, startTrackPlayback, syncPrevThreshold]);

  const toggleShuffle = useCallback(() => {
    setShuffle((previous) => !previous);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeat((previous) => {
      if (previous === 'off') return 'all';
      if (previous === 'all') return 'one';
      return 'off';
    });
  }, []);

  const reportProgress = useCallback((seconds) => {
    if (!Number.isFinite(seconds)) return;
    // Keep the ref exact and synchronous — seek/crossfade/previous logic reads
    // progressRef.current directly and must never see a stale value.
    progressRef.current = seconds;
    syncPrevThreshold(seconds);
    // Coalesce the React state update to one per animation frame. The media
    // element can fire timeupdate several times per frame; batching here keeps
    // the seekbar visually smooth (<=60fps) while avoiding redundant renders.
    if (typeof requestAnimationFrame !== 'function') {
      setProgress(seconds);
      return;
    }
    if (progressRafRef.current != null) return;
    progressRafRef.current = requestAnimationFrame(() => {
      progressRafRef.current = null;
      setProgress(progressRef.current);
    });
  }, [syncPrevThreshold]);

  useEffect(() => () => {
    if (progressRafRef.current != null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(progressRafRef.current);
      progressRafRef.current = null;
    }
  }, []);

  const reportDuration = useCallback((seconds) => {
    if (Number.isFinite(seconds) && seconds > 0) setDuration(seconds);
  }, []);

  const extendSmartQueueAndContinue = useCallback(async () => {
    const active = currentTrackRef.current;
    if (!active) {
      setIsPlaying(false);
      return;
    }
    await generateSmartQueue(active, {
      localCandidates: [...queueStateRef.current.tracks, ...history],
    });

    const snapshot = queueStateRef.current;
    if (currentTrackRef.current?.id !== active.id) return;
    const nextIndex = resolveNextIndex({
      queueLength: snapshot.tracks.length,
      currentIndex: snapshot.currentIndex,
      shuffle,
      repeat: 'all',
    });
    if (nextIndex == null) {
      setIsPlaying(false);
      return;
    }
    const nextTrack = snapshot.tracks[nextIndex];
    if (!nextTrack) {
      setIsPlaying(false);
      return;
    }
    setQueueState((previous) => ({ ...previous, currentIndex: nextIndex }));
    startTrackPlayback(nextTrack);
  }, [generateSmartQueue, history, shuffle, startTrackPlayback]);

  // Called by FooterPlayer's onEnded — encapsulates repeat/autoplay/queue logic.
  const handleTrackEnded = useCallback(() => {
    if (repeat === 'one') {
      seekTo(0);
      setIsPlaying(true);
      return;
    }

    if (playNext()) return;

    if (
      settings?.autoplay
      && queueStateRef.current.queueMode === 'smart'
      && currentTrackRef.current
    ) {
      void extendSmartQueueAndContinue();
      return;
    }

    if (settings?.autoplay && currentTrackRef.current) {
      seekTo(0);
      setIsPlaying(true);
      return;
    }

    setIsPlaying(false);
  }, [extendSmartQueueAndContinue, playNext, repeat, seekTo, settings?.autoplay]);

  // Keep queue cursor in sync with external track swaps (e.g. restored state).
  useEffect(() => {
    if (!currentTrack?.id) return;
    setQueueState((previous) => {
      if (!previous.tracks.length) return previous;
      if (previous.currentIndex >= 0 && previous.tracks[previous.currentIndex]?.id === currentTrack.id) {
        return previous;
      }
      const index = previous.tracks.findIndex((row) => row.id === currentTrack.id);
      if (index < 0) return previous;
      return { ...previous, currentIndex: index };
    });
  }, [currentTrack?.id]);

  const canGoNext = useMemo(() => {
    if (!queue.length || queueIndex < 0) return false;
    if (shuffle && queue.length > 1) return true;
    if (queueIndex < queue.length - 1) return true;
    return repeat === 'all' && queue.length > 0;
  }, [queue.length, queueIndex, shuffle, repeat]);

  // Lives on the durable context (not the per-tick progress slice). The playhead
  // contribution is the coarse `pastPrevThreshold` boolean, so this only changes
  // when crossing the restart threshold — not on every tick.
  const canGoPrevious = useMemo(
    () => queueIndex > 0 || (repeat === 'all' && queue.length > 1) || pastPrevThreshold,
    [queueIndex, repeat, queue.length, pastPrevThreshold],
  );

  // Stable slice — memoized so progress ticks don't invalidate it.
  const value = useMemo(
    () => ({
      currentTrack,
      isPlaying,
      volume,
      isMuted,
      queue,
      queueIndex,
      queueMode,
      history,
      shuffle,
      repeat,
      playTrack,
      togglePlay,
      setVolume,
      toggleMute,
      seekTo,
      addToQueue,
      playTracksInOrder,
      playTrackNext,
      removeFromQueue,
      removeFromQueueAt,
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
      canGoNext,
      canGoPrevious,
    }),
    [
      currentTrack,
      isPlaying,
      volume,
      isMuted,
      queue,
      queueIndex,
      queueMode,
      history,
      shuffle,
      repeat,
      playTrack,
      togglePlay,
      setVolume,
      toggleMute,
      seekTo,
      addToQueue,
      playTracksInOrder,
      playTrackNext,
      removeFromQueue,
      removeFromQueueAt,
      reorderQueue,
      clearQueue,
      playNext,
      playPrevious,
      toggleShuffle,
      toggleRepeat,
      handleTrackEnded,
      reportProgress,
      reportDuration,
      canGoNext,
      canGoPrevious,
    ],
  );

  // High-frequency slice — ONLY the raw playhead values. canGoPrevious moved to
  // the durable context above so transport surfaces don't re-render every tick.
  const progressValue = useMemo(
    () => ({
      progress,
      duration,
    }),
    [progress, duration],
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

// Subscribe only to the playhead (progress/duration/canGoPrevious).
export const usePlayerProgress = () => {
  const context = useContext(PlayerProgressContext);
  if (!context) {
    throw new Error('usePlayerProgress must be used within a PlayerProvider');
  }
  return context;
};
