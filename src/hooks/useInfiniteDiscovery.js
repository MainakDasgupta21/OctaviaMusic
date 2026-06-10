import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getExploreRadio, getExploreSimilar } from '@/lib/api';
import { cachePolicy, queryKeys } from '@/lib/query-keys';
import {
  buildInfiniteBatch,
  mergeInfiniteSources,
  normalizeFlowSeed,
} from '@/lib/explore-infinite';

const idOf = (track) => String(track?.id || track?.videoId || '');

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
  const cursorRef = useRef(0);
  const consumedRef = useRef(new Set());

  const {
    data: radioPayload = null,
    isLoading: radioLoading,
  } = useQuery({
    queryKey: queryKeys.exploreRadio({
      mood: normalizedSeed.mood,
      genre: normalizedSeed.genre,
      seed: normalizedSeed.seed,
      limit: 40,
    }),
    queryFn: ({ signal }) =>
      getExploreRadio({
        mood: normalizedSeed.mood,
        genre: normalizedSeed.genre,
        seed: normalizedSeed.seed,
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

  const {
    data: similarPayload = null,
    isLoading: similarLoading,
  } = useQuery({
    queryKey: queryKeys.exploreSimilar({ trackId: currentTrack?.id, limit: 12 }),
    queryFn: ({ signal }) =>
      getExploreSimilar({
        trackId: currentTrack?.id || '',
        limit: 12,
        signal,
      }),
    enabled: enabled && Boolean(currentTrack?.id),
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

  const fullPool = useMemo(
    () =>
      mergeInfiniteSources({
        localPool: basePool,
        similarItems,
      }),
    [basePool, similarItems],
  );

  const appendBatch = useCallback(
    (minimumDeck = 10) => {
      if (!enabled || fullPool.length === 0) return;
      setDeck((prev) => {
        if (prev.length >= minimumDeck) return prev;
        const next = buildInfiniteBatch({
          pool: fullPool,
          size: Math.max(8, minimumDeck - prev.length + 4),
          cursor: cursorRef.current,
          consumedIds: consumedRef.current,
          maxPerArtist: 2,
        });
        cursorRef.current = next.nextCursor;
        consumedRef.current = next.consumedIds;
        if (!next.items.length) return prev;
        return [...prev, ...next.items];
      });
    },
    [enabled, fullPool],
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
      setDeck((prev) => {
        if (!prev.length) return prev;
        const next = prev.slice(1);
        return next;
      });
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
    setStats((prev) => ({ ...prev, plays: prev.plays + 1 }));
  }, []);

  const remainingInPool = Math.max(0, fullPool.length - consumedRef.current.size);

  return {
    deck,
    currentTrack,
    radioPayload,
    similarPayload,
    radioLoading,
    similarLoading,
    isLoading: radioLoading && deck.length === 0,
    seed: normalizedSeed,
    remainingInPool,
    stats,
    markPlayed,
    saveTop: () => consumeTop('save'),
    skipTop: () => consumeTop('skip'),
    loadMore: () => appendBatch(16),
    getCurrentTrackId: () => idOf(deck[0]),
  };
};

export default useInfiniteDiscovery;
