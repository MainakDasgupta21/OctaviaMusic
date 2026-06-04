import { useCallback, useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useFavorites } from '@/contexts/FavoritesContext';
import { usePlayer } from '@/contexts/PlayerContext';
import { usePlaylists } from '@/contexts/PlaylistContext';
import { searchMusic } from '@/lib/api';
import { normalize, parseQuery, rankAndMerge } from '@/lib/search-rank';

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

export const useInstantSearch = (
  query,
  {
    enabled = true,
    debounceMs = 200,
    limit = 12,
    type = 'all',
    onPick,
  } = {},
) => {
  const { list: favorites } = useFavorites();
  const { history, currentTrack } = usePlayer();
  const { playlists } = usePlaylists();

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

  const { data: serverResults = [], isLoading, isFetching, isError } = useQuery({
    queryKey: ['instant-search', serverQuery, effectiveType],
    queryFn: () => searchMusic(serverQuery, effectiveType),
    enabled: shouldFetchServer,
    placeholderData: keepPreviousData,
  });

  const ranked = useMemo(
    () =>
      rankAndMerge({
        query: parsedQuery,
        serverResults,
        favorites,
        history,
        playlists,
        currentArtist: currentTrack?.artist || '',
        limit,
      }),
    [parsedQuery, serverResults, favorites, history, playlists, currentTrack?.artist, limit],
  );

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

