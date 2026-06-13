import {
  createContext,
  useContext,
  useMemo,
  useCallback,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sanitizeTrack } from '@/lib/media-sanitize';
import { artistSlugOf } from '@/lib/slug';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import notify from '@/lib/notify';

const favoritesQueryKey = (userId) => ['me', 'favorites', userId];

// Stored shape shared between optimistic UI writes and server responses.
// `artistSlug` and `albumId` were added later; older rows may lack them.
const toFavoriteShape = (track, addedAt) => ({
  id: track.id,
  videoId: track.videoId,
  title: track.title || '',
  artist: track.artist || '',
  artistId: track.artistId || null,
  artistSlug: track.artistSlug || artistSlugOf(track) || null,
  albumId: track.albumId || null,
  thumbnail: track.thumbnail,
  duration: track.duration,
  addedAt: Number.isFinite(addedAt) ? addedAt : Number(track.addedAt) || Date.now(),
});

const FavoritesContext = createContext(undefined);

const mapFavoritesList = (items) => {
  if (!Array.isArray(items)) return {};
  return items.reduce((acc, raw) => {
    const track = sanitizeTrack(raw, { requirePlayable: true });
    if (!track?.id) return acc;
    acc[track.id] = toFavoriteShape({ ...raw, ...track }, raw?.addedAt);
    return acc;
  }, {});
};

export const FavoritesProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || user?._id || null;
  const queryClient = useQueryClient();
  const queryKey = favoritesQueryKey(userId);

  const favoritesQuery = useQuery({
    queryKey,
    enabled: Boolean(userId),
    queryFn: async () => {
      const response = await api.get('/me/favorites');
      return mapFavoritesList(response.data?.items || []);
    },
    staleTime: 30000,
  });

  const addFavoriteMutation = useMutation({
    mutationFn: async (track) => {
      await api.post('/me/favorites', { track });
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async (trackId) => {
      await api.delete(`/me/favorites/${encodeURIComponent(trackId)}`);
    },
  });

  const favorites = userId ? favoritesQuery.data || {} : {};

  const toggleFavorite = useCallback((track) => {
    const safeTrack = sanitizeTrack(track, { requirePlayable: true });
    if (!safeTrack?.id) return false;

    if (!userId) {
      notify.signInRequired('save favorites');
      return null;
    }

    const prev = queryClient.getQueryData(queryKey) || {};
    const exists = Boolean(prev[safeTrack.id]);
    const next = { ...prev };
    if (exists) {
      delete next[safeTrack.id];
      queryClient.setQueryData(queryKey, next);
      removeFavoriteMutation.mutate(safeTrack.id, {
        onError: () => queryClient.setQueryData(queryKey, prev),
      });
      return false;
    }

    next[safeTrack.id] = toFavoriteShape({ ...track, ...safeTrack }, Date.now());
    queryClient.setQueryData(queryKey, next);
    addFavoriteMutation.mutate(next[safeTrack.id], {
      onError: () => queryClient.setQueryData(queryKey, prev),
    });
    return true;
  }, [addFavoriteMutation, queryClient, queryKey, removeFavoriteMutation, userId]);

  const removeFavorite = useCallback((id) => {
    if (!id) return;

    if (!userId) {
      notify.signInRequired('manage favorites');
      return;
    }

    const prev = queryClient.getQueryData(queryKey) || {};
    if (!prev[id]) return;
    const next = { ...prev };
    delete next[id];
    queryClient.setQueryData(queryKey, next);
    removeFavoriteMutation.mutate(id, {
      onError: () => queryClient.setQueryData(queryKey, prev),
    });
  }, [queryClient, queryKey, removeFavoriteMutation, userId]);

  const isFavorite = useCallback((id) => Boolean(favorites[id]), [favorites]);

  const list = useMemo(
    () => Object.values(favorites).sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0)),
    [favorites],
  );

  const value = useMemo(
    () => ({ favorites, list, count: list.length, isFavorite, toggleFavorite, removeFavorite }),
    [favorites, list, isFavorite, toggleFavorite, removeFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return ctx;
};
