import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getExploreRadio, getExploreSimilar } from '@/lib/api';
import {
  getSeenTrackSet,
  markTrackSeen,
  subscribeDiscoveryMemory,
} from '@/lib/discovery-memory';
import { cachePolicy, queryKeys } from '@/lib/query-keys';
import {
  buildInfiniteBatch,
  mergeInfiniteSources,
  normalizeFlowSeed,
} from '@/lib/explore-infinite';

const FLOW_STRATEGIES = [
  'mixed',
  'artist',
  'keyword',
  'alphabet',
  'hidden',
  'fresh',
  'trending',
  'classic',
  'genre',
  'mood',
  'personalized',
];
const DISCOVERY_HORIZON_MS = 30 * 24 * 60 * 60 * 1000;
const LOW_POOL_THRESHOLD = 4;

const idOf = (track) => String(track?.id || track?.videoId || '');
const stableHash = (value) => {
  const text = String(value || '');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
};
const seedArtistsFromPool = (rows = []) => {
  const seen = new Set();
  const out = [];
  for (const row of rows || []) {
    const artist = String(row?.artist || '').trim();
    const key = artist.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(artist);
    if (out.length >= 5) break;
  }
  return out;
};

export const useInfiniteDiscovery = ({
  localPool = [],
  mood = '',
  genre = '',
  seed = '',
  enabled = true,
} = {}) => {
  const normalizedSeed = useMemo(
    () => normalizeFlowSeed({ mood, genre, seed }),
    [mood, genre, seed],
  );
  const [deck, setDeck] = useState([]);
  const [stats, setStats] = useState({
    plays: 0,
    saves: 0,
    skips: 0,
    swipes: 0,
  });
  const [strategyIndex, setStrategyIndex] = useState(0);
  const [strategyNonce, setStrategyNonce] = useState(0);
  const [memoryRevision, setMemoryRevision] = useState(0);
  const cursorRef = useRef(0);
  const consumedRef = useRef(new Set());
  const persistedSeenRef = useRef(new Set());
  const rotateLockRef = useRef(0);

  useEffect(
    () =>
      subscribeDiscoveryMemory(() => {
        setMemoryRevision((prev) => prev + 1);
      }),
    [],
  );

  const persistedSeenSet = useMemo(
    () => getSeenTrackSet({ horizonMs: DISCOVERY_HORIZON_MS }),
    [memoryRevision],
  );
  useEffect(() => {
    persistedSeenRef.current = new Set(persistedSeenSet);
  }, [persistedSeenSet]);

  const baseStrategyIndex = useMemo(
    () => stableHash(`${normalizedSeed.mood}:${normalizedSeed.genre}:${normalizedSeed.seed}`) % FLOW_STRATEGIES.length,
    [normalizedSeed.genre, normalizedSeed.mood, normalizedSeed.seed],
  );
  useEffect(() => {
    setStrategyIndex(baseStrategyIndex);
    setStrategyNonce(0);
  }, [baseStrategyIndex]);

  const activeStrategy = FLOW_STRATEGIES[strategyIndex] || 'mixed';
  const strategySeed = `${normalizedSeed.seed || 'flow'}:${activeStrategy}:${strategyNonce}`;
  const seedArtists = useMemo(
    () => seedArtistsFromPool(localPool),
    [localPool],
  );

  const rotateStrategy = useCallback(() => {
    const now = Date.now();
    if (now - rotateLockRef.current < 1200) return;
    rotateLockRef.current = now;
    setStrategyIndex((prev) => (prev + 1) % FLOW_STRATEGIES.length);
    setStrategyNonce((prev) => prev + 1);
  }, []);

  const {
    data: radioPayload = null,
    isLoading: radioLoading,
  } = useQuery({
    queryKey: queryKeys.exploreRadio({
      mood: normalizedSeed.mood,
      genre: normalizedSeed.genre,
      seed: strategySeed,
      strategy: activeStrategy,
      seedArtists: seedArtists.join(','),
      limit: 40,
    }),
    queryFn: ({ signal }) =>
      getExploreRadio({
        mood: normalizedSeed.mood,
        genre: normalizedSeed.genre,
        seed: strategySeed,
        strategy: activeStrategy,
        seedArtists,
        limit: 40,
        signal,
      }),
    enabled,
    ...cachePolicy.exploreRadio,
  });

  const radioItems = useMemo(
    () => (Array.isArray(radioPayload?.items) ? radioPayload.items : []),
    [radioPayload?.items],
  );
  const currentTrack = deck[0] || null;
  const currentTrackId = currentTrack?.id || currentTrack?.videoId || '';

  const {
    data: similarPayload = null,
    isLoading: similarLoading,
  } = useQuery({
    queryKey: queryKeys.exploreSimilar({ trackId: currentTrackId, limit: 12 }),
    queryFn: ({ signal }) =>
      getExploreSimilar({
        trackId: currentTrackId,
        limit: 12,
        signal,
      }),
    enabled: enabled && Boolean(currentTrackId),
    ...cachePolicy.exploreSimilar,
  });
  const similarItems = useMemo(
    () => (Array.isArray(similarPayload?.items) ? similarPayload.items : []),
    [similarPayload?.items],
  );

  const basePool = useMemo(
    () =>
      mergeInfiniteSources({
        localPool,
        radioItems,
      }),
    [localPool, radioItems],
  );

  const fullPool = useMemo(() => {
    const merged = mergeInfiniteSources({
      localPool: basePool,
      similarItems,
    });
    const unseen = merged.filter((track) => !persistedSeenSet.has(idOf(track)));
    return unseen.length ? unseen : merged;
  }, [basePool, similarItems, persistedSeenSet]);

  const appendBatch = useCallback(
    (minimumDeck = 10) => {
      if (!enabled) return;
      if (fullPool.length === 0) {
        rotateStrategy();
        return;
      }
      let shouldRotate = false;
      setDeck((prev) => {
        if (prev.length >= minimumDeck) return prev;
        const requestedSize = Math.max(8, minimumDeck - prev.length + 4);
        const consumedInPoolCount = fullPool.reduce((count, track) => {
          const trackId = idOf(track);
          if (!trackId) return count;
          return consumedRef.current.has(trackId) ? count + 1 : count;
        }, 0);
        let blockedIds = new Set([...persistedSeenRef.current, ...consumedRef.current]);
        let next = buildInfiniteBatch({
          pool: fullPool,
          size: requestedSize,
          cursor: cursorRef.current,
          consumedIds: blockedIds,
          maxPerArtist: 2,
        });
        const shouldResetConsumed = !next.items.length && consumedInPoolCount >= fullPool.length;
        if (shouldResetConsumed) {
          cursorRef.current = 0;
          consumedRef.current = new Set();
          blockedIds = new Set(persistedSeenRef.current);
          next = buildInfiniteBatch({
            pool: fullPool,
            size: requestedSize,
            cursor: cursorRef.current,
            consumedIds: blockedIds,
            maxPerArtist: 2,
          });
        }
        cursorRef.current = next.nextCursor;
        if (!next.items.length) {
          shouldRotate = true;
          return prev;
        }
        const nextConsumed = new Set(consumedRef.current);
        next.items.forEach((track) => {
          const trackId = idOf(track);
          if (trackId) nextConsumed.add(trackId);
        });
        consumedRef.current = nextConsumed;
        return [...prev, ...next.items];
      });
      if (shouldRotate) rotateStrategy();
    },
    [enabled, fullPool, rotateStrategy],
  );

  useEffect(() => {
    cursorRef.current = 0;
    consumedRef.current = new Set();
    setDeck([]);
    setStats({ plays: 0, saves: 0, skips: 0, swipes: 0 });
  }, [normalizedSeed.mood, normalizedSeed.genre, normalizedSeed.seed]);

  useEffect(() => {
    appendBatch(14);
  }, [appendBatch]);

  const consumeTop = useCallback(
    (kind) => {
      let consumedTrack = null;
      setDeck((prev) => {
        if (!prev.length) return prev;
        consumedTrack = prev[0] || null;
        return prev.slice(1);
      });
      if (consumedTrack) {
        const consumedId = idOf(consumedTrack);
        if (consumedId) consumedRef.current.add(consumedId);
        markTrackSeen(consumedTrack, `flow_${kind}`);
      }
      setStats((prev) => ({
        ...prev,
        swipes: prev.swipes + (kind === 'save' || kind === 'skip' ? 1 : 0),
        saves: prev.saves + (kind === 'save' ? 1 : 0),
        skips: prev.skips + (kind === 'skip' ? 1 : 0),
      }));
      appendBatch(10);
    },
    [appendBatch],
  );

  const markPlayed = useCallback(() => {
    if (currentTrack) {
      const currentId = idOf(currentTrack);
      if (currentId) consumedRef.current.add(currentId);
      markTrackSeen(currentTrack, 'flow_play');
    }
    setStats((prev) => ({ ...prev, plays: prev.plays + 1 }));
  }, [currentTrack]);

  const remainingInPool = Math.max(
    0,
    fullPool.reduce((count, track) => {
      const trackId = idOf(track);
      if (!trackId) return count;
      return consumedRef.current.has(trackId) ? count : count + 1;
    }, 0),
  );
  useEffect(() => {
    if (!enabled) return;
    if (deck.length > LOW_POOL_THRESHOLD) return;
    if (remainingInPool > LOW_POOL_THRESHOLD) return;
    rotateStrategy();
  }, [deck.length, enabled, remainingInPool, rotateStrategy]);

  return {
    deck,
    currentTrack,
    radioPayload,
    similarPayload,
    radioLoading,
    similarLoading,
    isLoading: radioLoading && deck.length === 0,
    seed: normalizedSeed,
    strategy: activeStrategy,
    remainingInPool,
    stats,
    markPlayed,
    saveTop: () => consumeTop('save'),
    skipTop: () => consumeTop('skip'),
    loadMore: () => appendBatch(16),
    rotateStrategy,
    getCurrentTrackId: () => idOf(deck[0]),
  };
};

export default useInfiniteDiscovery;
