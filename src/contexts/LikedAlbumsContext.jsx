import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import notify from '@/lib/notify';

const likedAlbumsQueryKey = (userId) => ['me', 'liked-albums', userId];

const LikedAlbumsContext = createContext(undefined);

// Stable empty reference for the loading/guest state (avoids per-render `{}`).
const EMPTY_LIKED = Object.freeze({});

const toLikedShape = (album) => ({
  id: album.id,
  title: album.title || 'Untitled',
  artist: album.artist || '',
  artistSlug: album.artistSlug || null,
  thumbnail: album.thumbnail || album.cover || null,
  year: album.year || null,
  likedAt: Number.isFinite(album.likedAt) ? album.likedAt : Date.now(),
});

const mapLikedAlbums = (items) => {
  if (!Array.isArray(items)) return {};
  return items.reduce((acc, album) => {
    if (!album?.id) return acc;
    acc[album.id] = toLikedShape(album);
    return acc;
  }, {});
};

export const LikedAlbumsProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || user?._id || null;
  const queryClient = useQueryClient();
  const queryKey = likedAlbumsQueryKey(userId);

  const likedQuery = useQuery({
    queryKey,
    enabled: Boolean(userId),
    queryFn: async () => {
      const response = await api.get('/me/liked-albums');
      return mapLikedAlbums(response.data?.items || []);
    },
    staleTime: 30000,
  });

  const addLikedMutation = useMutation({
    mutationFn: async (album) => {
      await api.post('/me/liked-albums', { album });
    },
  });

  const removeLikedMutation = useMutation({
    mutationFn: async (albumId) => {
      await api.delete(`/me/liked-albums/${encodeURIComponent(albumId)}`);
    },
  });

  const liked = userId ? likedQuery.data || EMPTY_LIKED : EMPTY_LIKED;

  const isLiked = useCallback((id) => Boolean(id && liked[id]), [liked]);

  const toggleLiked = useCallback((album) => {
    if (!album?.id) return false;

    if (!userId) {
      notify.signInRequired('like albums');
      return null;
    }

    const prev = queryClient.getQueryData(queryKey) || {};
    const exists = Boolean(prev[album.id]);
    const next = { ...prev };
    if (exists) {
      delete next[album.id];
      queryClient.setQueryData(queryKey, next);
      removeLikedMutation.mutate(album.id, {
        onError: () => queryClient.setQueryData(queryKey, prev),
      });
      return false;
    }

    next[album.id] = toLikedShape(album);
    queryClient.setQueryData(queryKey, next);
    addLikedMutation.mutate(next[album.id], {
      onError: () => queryClient.setQueryData(queryKey, prev),
    });
    return true;
  }, [addLikedMutation, queryClient, queryKey, removeLikedMutation, userId]);

  const removeLiked = useCallback((id) => {
    if (!id) return;

    if (!userId) {
      notify.signInRequired('manage liked albums');
      return;
    }

    const prev = queryClient.getQueryData(queryKey) || {};
    if (!prev[id]) return;
    const next = { ...prev };
    delete next[id];
    queryClient.setQueryData(queryKey, next);
    removeLikedMutation.mutate(id, {
      onError: () => queryClient.setQueryData(queryKey, prev),
    });
  }, [queryClient, queryKey, removeLikedMutation, userId]);

  const list = useMemo(
    () => Object.values(liked).sort((a, b) => (b.likedAt || 0) - (a.likedAt || 0)),
    [liked],
  );

  const value = useMemo(
    () => ({ liked, list, count: list.length, isLiked, toggleLiked, removeLiked }),
    [liked, list, isLiked, toggleLiked, removeLiked],
  );

  return (
    <LikedAlbumsContext.Provider value={value}>{children}</LikedAlbumsContext.Provider>
  );
};

export const useLikedAlbums = () => {
  const ctx = useContext(LikedAlbumsContext);
  if (!ctx) {
    throw new Error('useLikedAlbums must be used within a LikedAlbumsProvider');
  }
  return ctx;
};
