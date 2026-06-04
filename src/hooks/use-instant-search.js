import { useCallback, useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFavorites } from '@/contexts/FavoritesContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { usePlaylists } from '@/contexts/PlaylistContext';
import { searchMusic } from '@/lib/api';
import { cachePolicy, queryKeys } from '@/lib/query-keys';
import { normalize, parseQuery } from '@/lib/search-rank';
import { useRankedSearch } from '@/hooks/use-ranked-search';
import { usePersonalizationSignals } from '@/hooks/use-personalization-signals';

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

const useDebouncedValue = (value, delay) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

const itemKey = (row) => {
  const kind = row.item?._kind || row.kind || 'song';
  return `${kind}:${row.item?.videoId || row.item?.id || normalize(row.item?.title || row.item?.name)}`;
};

const flattenRanked = (ranked) => {
  const rows = [];
  const seen = new Set();
  const push = (section, kind, item) => {
    if (!item) return;
    const row = { section, kind, item };
    const key = itemKey(row);
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ ...row, key });
  };

  push('top', ranked.top?._kind || 'song', ranked.top);
  ranked.songs.forEach((item) => push('songs', 'song', item));
  ranked.artists.forEach((item) => push('artists', 'artist', item));
  ranked.albums.forEach((item) => push('albums', 'album', item));
  ranked.library.forEach((item) => push('library', 'song', item));

  return rows;
};

// Per-call default for the request payload size. The TopBar typically wants
// 30 rows of upstream data so its "top + 5 exact + 5 related + 3 artists +
// 3 albums + 3 library" layout has enough fuel after dedupe + score floor.
const DEFAULT_SERVER_LIMIT = 30;

// Limit the SearchPage prefetches with so a click on "View all" warms a
// richer payload instantly. Bumped above the TopBar fetch so the SearchPage's
// 5-up grids don't paint half-empty.
const PREFETCH_LIMIT = 60;

export const useInstantSearch = (
  query,
  {
    enabled = true,
    debounceMs = 200,
    limit = 12,
    serverLimit = DEFAULT_SERVER_LIMIT,
    type = 'all',
    onPick,
    prefetchSearchPage = true,
    sortHint = null,
  } = {},
) => {
  const { list: favorites } = useFavorites();
  const { history, currentTrack } = usePlayer();
  const { playlists } = usePlaylists();
  const queryClient = useQueryClient();
  const { historyArtistCounts, recentSearchTerms } = usePersonalizationSignals();

  const raw = (query || '').trim();
  const debouncedQuery = useDebouncedValue(raw, debounceMs);
  const parsedQuery = useMemo(() => parseQuery(debouncedQuery), [debouncedQuery]);

  const hasTextQuery = Boolean(
    parsedQuery.termsNormalized ||
      parsedQuery.tokens?.length ||
      parsedQuery.phrases?.length ||
      parsedQuery.negativeTokens?.length,
  );
  const hasFilterQuery = Boolean(parsedQuery.hasFilters);
  const canSearch = Boolean(enabled && (hasTextQuery || hasFilterQuery));

  const serverQuery =
    parsedQuery.terms || parsedQuery.filters.artist || parsedQuery.filters.album || '';
  const effectiveType = parsedQuery.filters.type || type || 'all';
  const shouldFetchServer = Boolean(canSearch && serverQuery);

  // Unified cache key: the TopBar, SearchPage and CommandPalette all share
  // one cache entry per (query, type, limit) tuple now. Previously the
  // TopBar used `['instant-search', q, type]` which forced a duplicate
  // upstream fetch for every keystroke that the SearchPage would also
  // request on Enter.
  const { data: serverResults = [], isLoading, isFetching, isError } = useQuery({
    queryKey: queryKeys.search(serverQuery, effectiveType, serverLimit),
    queryFn: () => searchMusic(serverQuery, effectiveType, { limit: serverLimit }),
    enabled: shouldFetchServer,
    ...cachePolicy.search,
    placeholderData: keepPreviousData,
  });

  // Typing-pause prefetch: once the user stops typing for the debounce
  // window AND the TopBar fetch has settled, warm a richer 60-row payload
  // for the SearchPage so navigating there via Enter / "View all" is
  // instant. React Query dedupes by key — if the SearchPage is already
  // cached this is a no-op.
  useEffect(() => {
    if (!prefetchSearchPage) return;
    if (!shouldFetchServer) return;
    if (serverLimit >= PREFETCH_LIMIT) return; // already at SearchPage size
    // Always prefetch the 'all' bucket since the SearchPage opens to All by
    // default; the chip filter will narrow on the client without refetching.
    const key = queryKeys.search(serverQuery, 'all', PREFETCH_LIMIT);
    queryClient
      .prefetchQuery({
        queryKey: key,
        queryFn: () => searchMusic(serverQuery, 'all', { limit: PREFETCH_LIMIT }),
        ...cachePolicy.search,
      })
      .catch(() => {
        /* best-effort prefetch; the SearchPage will retry on its own. */
      });
  }, [prefetchSearchPage, shouldFetchServer, serverQuery, serverLimit, queryClient]);

  // Delegate the rank+merge to `useRankedSearch`. It is a sync ranker for
  // small candidate pools (the TopBar's typical 10–30 row payload) and
  // transparently switches to a Web Worker once the pool clears its internal
  // threshold (50). That way large search payloads (SearchPage / 60-row
  // CommandPalette) don't block the main thread.
  const rankParams = useMemo(
    () => ({
      query: parsedQuery,
      serverResults,
      favorites,
      history,
      playlists,
      currentArtist: currentTrack?.artist || '',
      limit,
      historyArtistCounts,
      recentSearchTerms,
      sortHint,
    }),
    [
      parsedQuery,
      serverResults,
      favorites,
      history,
      playlists,
      currentTrack?.artist,
      limit,
      historyArtistCounts,
      recentSearchTerms,
      sortHint,
    ],
  );
  const ranked = useRankedSearch(rankParams);

  const flatResults = useMemo(() => flattenRanked(ranked), [ranked]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [debouncedQuery, flatResults.length]);

  const move = useCallback(
    (dir) => {
      if (!flatResults.length) return;
      const delta = dir === 'up' ? -1 : 1;
      setSelectedIndex((i) => clamp(i + delta, 0, flatResults.length - 1));
    },
    [flatResults.length],
  );

  const selected = flatResults[selectedIndex] || null;

  const pick = useCallback(() => {
    if (!selected) return null;
    onPick?.(selected);
    return selected;
  }, [selected, onPick]);

  const status = useMemo(() => {
    if (!canSearch) return 'idle';
    if (isError) return 'error';
    if ((isLoading || isFetching) && ranked.all.length === 0 && shouldFetchServer) {
      return 'loading';
    }
    if (ranked.all.length === 0) return 'empty';
    return 'ready';
  }, [canSearch, isError, isLoading, isFetching, ranked.all.length, shouldFetchServer]);

  return {
    status,
    query: parsedQuery,
    results: ranked,
    flatResults,
    selectedIndex,
    selected,
    setSelectedIndex,
    move,
    pick,
    isFetching,
    isLoading,
    isError,
  };
};

export default useInstantSearch;

