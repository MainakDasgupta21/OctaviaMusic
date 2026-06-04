import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys, cachePolicy } from '@/lib/query-keys';
import { getAlbum, getArtist } from '@/lib/api';

// =============================================================================
// Route + data prefetching for hover/focus interactions.
// - `registerPrefetch` lets App.jsx hook lazy chunk loaders to a route path so
//   we can pre-import the JS bundle before the click.
// - `usePrefetchProps` returns hover/focus/touch handlers that warm the chunk.
// - `usePrefetchData` returns helpers that warm React Query caches for the
//   detail-route data, so hovering a card pre-fetches its album/artist payload.
// =============================================================================

const registry = new Map();

export const registerPrefetch = (path, loader) => {
  registry.set(path, loader);
};

const seen = new Set();

export const useRoutePrefetch = () => {
  return useCallback((path) => {
    if (!path || seen.has(path)) return;
    const loader = registry.get(path);
    if (!loader) return;
    seen.add(path);
    try {
      // Fire and forget — even on failure we'll retry on actual navigation.
      Promise.resolve(loader()).catch(() => seen.delete(path));
    } catch {
      seen.delete(path);
    }
  }, []);
};

// Convenience prop spreader for NavLink-like elements.
export const usePrefetchProps = (path) => {
  const prefetch = useRoutePrefetch();
  const handler = useCallback(() => prefetch(path), [prefetch, path]);
  return {
    onMouseEnter: handler,
    onFocus: handler,
    onTouchStart: handler,
  };
};

// =============================================================================
// React Query prefetch helpers
// =============================================================================

export const usePrefetchData = () => {
  const queryClient = useQueryClient();

  // Generic hook so callers can prefetch any registered query — useful for
  // future detail-routes (playlist, mix, …) without changing this module.
  const prefetchQuery = useCallback(
    (queryKey, queryFn, policy) => {
      if (!queryKey || !queryFn) return;
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        // staleTime keeps the prefetched data hot long enough for the actual
        // navigation to consume it without a refetch flash.
        staleTime: policy?.staleTime ?? 30_000,
        gcTime: policy?.gcTime,
      }).catch(() => {
        /* swallow — best-effort prefetch */
      });
    },
    [queryClient],
  );

  const prefetchAlbum = useCallback(
    (id) => {
      if (!id) return;
      prefetchQuery(queryKeys.album(id), () => getAlbum(id), cachePolicy.album);
    },
    [prefetchQuery],
  );

  const prefetchArtist = useCallback(
    (slug) => {
      if (!slug) return;
      prefetchQuery(queryKeys.artist(slug), () => getArtist(slug), cachePolicy.artist);
    },
    [prefetchQuery],
  );

  return { prefetchQuery, prefetchAlbum, prefetchArtist };
};

// =============================================================================
// Combined hover-prefetch helper: warms BOTH the route chunk (via the path
// registry) and the React Query cache for the destination's primary data.
// =============================================================================

export const useHoverPrefetch = () => {
  const prefetchRoute = useRoutePrefetch();
  const { prefetchAlbum, prefetchArtist } = usePrefetchData();

  const onAlbum = useCallback(
    (id) => {
      if (!id) return;
      prefetchRoute(`/album/${id}`);
      prefetchAlbum(id);
    },
    [prefetchRoute, prefetchAlbum],
  );

  const onArtist = useCallback(
    (slug) => {
      if (!slug) return;
      prefetchRoute(`/artist/${slug}`);
      prefetchArtist(slug);
    },
    [prefetchRoute, prefetchArtist],
  );

  return { onAlbum, onArtist };
};

// Compose hover/focus/touch listeners for an album link.
export const useAlbumPrefetchProps = (albumId) => {
  const { onAlbum } = useHoverPrefetch();
  const handler = useCallback(() => onAlbum(albumId), [onAlbum, albumId]);
  return albumId
    ? { onMouseEnter: handler, onFocus: handler, onTouchStart: handler }
    : {};
};

// Compose hover/focus/touch listeners for an artist link.
export const useArtistPrefetchProps = (slug) => {
  const { onArtist } = useHoverPrefetch();
  const handler = useCallback(() => onArtist(slug), [onArtist, slug]);
  return slug
    ? { onMouseEnter: handler, onFocus: handler, onTouchStart: handler }
    : {};
};
