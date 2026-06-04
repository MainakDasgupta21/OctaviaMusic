// =============================================================================
// Surfaces "trending searches" derived from the cached weekly charts payload.
// We don't run real search analytics; instead we treat the weekly charts as a
// proxy for what people are listening to right now and pull the top N
// artists + song titles.
//
// The hook is read-only and side-effect free at call time — it relies on the
// shared React Query cache key for charts so the data is reused if the user
// has already visited /charts.
// =============================================================================

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCharts } from '@/lib/api';
import { cachePolicy, queryKeys } from '@/lib/query-keys';

const DEFAULT_LIMIT = 6;
const CHARTS_REGION = 'global';
const CHARTS_WINDOW = 'weekly';
const CHARTS_FETCH_SIZE = 50;

const dedupeStrings = (values) => {
  const seen = new Set();
  const out = [];
  for (const raw of values) {
    const v = String(raw || '').trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
};

const extractList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

export const useTrendingSearches = ({ enabled = true, limit = DEFAULT_LIMIT } = {}) => {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.charts(CHARTS_REGION, CHARTS_WINDOW, CHARTS_FETCH_SIZE),
    queryFn: () =>
      getCharts({ region: CHARTS_REGION, window: CHARTS_WINDOW, limit: CHARTS_FETCH_SIZE }),
    enabled,
    ...cachePolicy.charts,
  });

  const trending = useMemo(() => {
    const list = extractList(data);
    if (list.length === 0) {
      return { artists: [], titles: [], terms: [] };
    }
    const artists = dedupeStrings(list.map((t) => t?.artist).filter(Boolean)).slice(0, limit);
    const titles = dedupeStrings(list.map((t) => t?.title || t?.name).filter(Boolean)).slice(0, limit);

    // Interleave artists / titles so the strip surfaces a balanced mix.
    const terms = [];
    const max = Math.max(artists.length, titles.length);
    for (let i = 0; i < max; i += 1) {
      if (artists[i]) terms.push({ kind: 'artist', label: artists[i] });
      if (titles[i]) terms.push({ kind: 'song', label: titles[i] });
      if (terms.length >= limit * 2) break;
    }

    return { artists, titles, terms };
  }, [data, limit]);

  return {
    ...trending,
    isLoading,
    isFetching,
  };
};

export default useTrendingSearches;
