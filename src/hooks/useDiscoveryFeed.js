import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  getArtistFatigueMap,
  getRecentStrategies,
  getSeenTrackSet,
  markStrategyUsed,
  subscribeDiscoveryMemory,
} from '@/lib/discovery-memory';
import {
  buildStrategyRequests,
  pickStrategies,
} from '@/lib/discovery-strategies';
import { buildDeckSeed } from '@/lib/surprise-random';

const DAY_MS = 24 * 60 * 60 * 1000;
const DISCOVERY_SEEN_HORIZON_MS = 30 * DAY_MS;

const normalize = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const trackIdOf = (track) =>
  String(track?.id || track?.videoId || `${track?.title || ''}::${track?.artist || ''}`);

const extractTracks = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.songs)) return payload.songs;
  if (Array.isArray(payload?.tracks)) return payload.tracks;
  if (Array.isArray(payload?.results?.songs)) return payload.results.songs;
  if (Array.isArray(payload?.results?.tracks)) return payload.results.tracks;
  return [];
};

const dedupeTracks = (rows = []) => {
  const seen = new Set();
  const out = [];
  for (const row of rows || []) {
    const id = trackIdOf(row);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
};

const stableHash = (value) => {
  const text = String(value || '');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
};

export const useDiscoveryFeed = ({
  mood = '',
  genre = '',
  tasteSeed = null,
  tasteProfile = null,
  followedArtists = [],
  history = [],
  favorites = [],
  enabled = true,
} = {}) => {
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [memoryRevision, setMemoryRevision] = useState(0);
  const sessionRotationSeed = useMemo(
    () => `${buildDeckSeed()}:${refreshNonce}`,
    [refreshNonce],
  );

  useEffect(
    () =>
      subscribeDiscoveryMemory(() => {
        setMemoryRevision((prev) => prev + 1);
      }),
    [],
  );

  const strategyContext = useMemo(
    () => ({
      mood,
      genre,
      visitSeed: sessionRotationSeed,
      tasteSeed,
      tasteProfile,
      followedArtists,
      history,
      favorites,
      limit: 40,
    }),
    [
      mood,
      genre,
      sessionRotationSeed,
      tasteSeed,
      tasteProfile,
      followedArtists,
      history,
      favorites,
    ],
  );

  const strategySelectionContextRef = useRef(strategyContext);
  strategySelectionContextRef.current = strategyContext;

  const strategySessionContext = useMemo(
    () => strategySelectionContextRef.current || strategyContext,
    [sessionRotationSeed],
  );

  const selectedStrategies = useMemo(
    () =>
      pickStrategies({
        count: 4,
        ctx: strategySessionContext,
        recent: getRecentStrategies({ window: 3 }),
      }),
    [sessionRotationSeed],
  );

  const strategyRequests = useMemo(
    () =>
      buildStrategyRequests({
        strategies: selectedStrategies,
        ctx: strategySessionContext,
      }),
    [sessionRotationSeed, selectedStrategies, strategySessionContext],
  );

  const queryResults = useQueries({
    queries: strategyRequests.map((request) => ({
      queryKey: ['explore', 'discovery-feed', sessionRotationSeed, request.id, ...request.queryKey],
      queryFn: request.queryFn,
      enabled,
      staleTime: 60_000,
      gcTime: 15 * 60_000,
      retry: 1,
    })),
  });

  const recordedRef = useRef(new Set());
  useEffect(() => {
    recordedRef.current = new Set();
  }, [sessionRotationSeed]);

  useEffect(() => {
    strategyRequests.forEach((request, index) => {
      const result = queryResults[index];
      if (!result?.isSuccess || recordedRef.current.has(request.id)) return;
      const tracks = extractTracks(result.data);
      if (!tracks.length) return;
      markStrategyUsed(request.id);
      recordedRef.current.add(request.id);
    });
  }, [queryResults, strategyRequests]);

  const seenSet = useMemo(
    () => getSeenTrackSet({ horizonMs: DISCOVERY_SEEN_HORIZON_MS }),
    [memoryRevision],
  );
  const artistFatigue = useMemo(
    () => getArtistFatigueMap(),
    [memoryRevision],
  );

  const byStrategy = useMemo(
    () =>
      strategyRequests.map((request, index) => {
        const result = queryResults[index];
        const rows = dedupeTracks(extractTracks(result?.data));
        return {
          id: request.id,
          label: request.label,
          strategyId: request.strategyId,
          rows,
          isLoading: Boolean(result?.isLoading),
          isFetching: Boolean(result?.isFetching),
          error: result?.error || null,
        };
      }),
    [queryResults, strategyRequests],
  );

  const freshPool = useMemo(() => {
    const merged = dedupeTracks(byStrategy.flatMap((entry) => entry.rows));
    if (!merged.length) return [];
    let unseen = merged.filter((track) => !seenSet.has(trackIdOf(track)));
    if (!unseen.length) unseen = merged;
    return [...unseen].sort((left, right) => {
      const leftArtistFatigue = artistFatigue.get(normalize(left?.artist)) || 0;
      const rightArtistFatigue = artistFatigue.get(normalize(right?.artist)) || 0;
      if (leftArtistFatigue !== rightArtistFatigue) {
        return leftArtistFatigue - rightArtistFatigue;
      }
      const leftNoise = stableHash(`${trackIdOf(left)}:${sessionRotationSeed}`) % 1000;
      const rightNoise = stableHash(`${trackIdOf(right)}:${sessionRotationSeed}`) % 1000;
      return leftNoise - rightNoise;
    });
  }, [artistFatigue, byStrategy, seenSet, sessionRotationSeed]);

  const error = useMemo(
    () => queryResults.find((entry) => entry?.error)?.error || null,
    [queryResults],
  );

  const isLoading = enabled
    && strategyRequests.length > 0
    && queryResults.every((entry) => entry.isLoading);
  const isRefreshing = enabled
    && queryResults.some((entry) => entry.isFetching)
    && queryResults.some((entry) => entry.data);

  const refresh = useCallback(() => {
    setRefreshNonce((prev) => prev + 1);
  }, []);

  return {
    freshPool,
    byStrategy,
    usedStrategies: selectedStrategies.map((entry) => entry.id),
    sessionRotationSeed,
    isLoading,
    isRefreshing,
    error,
    refresh,
  };
};

export default useDiscoveryFeed;
