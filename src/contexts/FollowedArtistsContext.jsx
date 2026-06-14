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

const followedArtistsQueryKey = (userId) => ['me', 'followed-artists', userId];

const FollowedArtistsContext = createContext(undefined);

// Stable empty reference for the loading/guest state (avoids per-render `{}`).
const EMPTY_FOLLOWED = Object.freeze({});

const toFollowedShape = (artist) => ({
  slug: artist.slug || artist.id || '',
  id: artist.id || artist.slug || '',
  name: artist.name || 'Unknown artist',
  thumbnail: artist.thumbnail || artist.cover || null,
  followedAt: Number.isFinite(artist.followedAt) ? artist.followedAt : Date.now(),
});

const followedKey = (artist) => artist?.slug || artist?.id || '';

const mapFollowedArtists = (items) => {
  if (!Array.isArray(items)) return {};
  return items.reduce((acc, item) => {
    const normalized = toFollowedShape(item);
    const key = followedKey(normalized);
    if (!key) return acc;
    acc[key] = normalized;
    return acc;
  }, {});
};

export const FollowedArtistsProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || user?._id || null;
  const queryClient = useQueryClient();
  const queryKey = followedArtistsQueryKey(userId);

  const followedQuery = useQuery({
    queryKey,
    enabled: Boolean(userId),
    queryFn: async () => {
      const response = await api.get('/me/followed-artists');
      return mapFollowedArtists(response.data?.items || []);
    },
    staleTime: 30000,
  });

  const addFollowMutation = useMutation({
    mutationFn: async (artist) => {
      await api.post('/me/followed-artists', { artist });
    },
  });

  const removeFollowMutation = useMutation({
    mutationFn: async (artistId) => {
      await api.delete(`/me/followed-artists/${encodeURIComponent(artistId)}`);
    },
  });

  const followed = userId ? followedQuery.data || EMPTY_FOLLOWED : EMPTY_FOLLOWED;

  const isFollowing = useCallback(
    (slugOrId) => {
      if (!slugOrId) return false;
      return Boolean(followed[slugOrId]);
    },
    [followed],
  );

  const toggleFollow = useCallback((artist) => {
    if (!artist) return false;
    const normalized = toFollowedShape(artist);
    const key = followedKey(normalized);
    if (!key) return false;

    if (!userId) {
      notify.signInRequired('follow artists');
      return null;
    }

    const prev = queryClient.getQueryData(queryKey) || {};
    const exists = Boolean(prev[key]);
    const next = { ...prev };
    if (exists) {
      delete next[key];
      queryClient.setQueryData(queryKey, next);
      removeFollowMutation.mutate(key, {
        onError: () => queryClient.setQueryData(queryKey, prev),
      });
      return false;
    }

    next[key] = normalized;
    queryClient.setQueryData(queryKey, next);
    addFollowMutation.mutate(normalized, {
      onError: () => queryClient.setQueryData(queryKey, prev),
    });
    return true;
  }, [addFollowMutation, queryClient, queryKey, removeFollowMutation, userId]);

  const unfollow = useCallback((slugOrId) => {
    if (!slugOrId) return;

    if (!userId) {
      notify.signInRequired('manage followed artists');
      return;
    }

    const prev = queryClient.getQueryData(queryKey) || {};
    const key = prev[slugOrId]
      ? slugOrId
      : Object.keys(prev).find((entryKey) => prev[entryKey]?.id === slugOrId) || slugOrId;
    if (!prev[key]) return;
    const next = { ...prev };
    delete next[key];
    queryClient.setQueryData(queryKey, next);
    removeFollowMutation.mutate(prev[key]?.id || slugOrId, {
      onError: () => queryClient.setQueryData(queryKey, prev),
    });
  }, [queryClient, queryKey, removeFollowMutation, userId]);

  const list = useMemo(
    () =>
      Object.values(followed).sort((a, b) => (b.followedAt || 0) - (a.followedAt || 0)),
    [followed],
  );

  const value = useMemo(
    () => ({ followed, list, count: list.length, isFollowing, toggleFollow, unfollow }),
    [followed, list, isFollowing, toggleFollow, unfollow],
  );

  return (
    <FollowedArtistsContext.Provider value={value}>
      {children}
    </FollowedArtistsContext.Provider>
  );
};

export const useFollowedArtists = () => {
  const ctx = useContext(FollowedArtistsContext);
  if (!ctx) {
    throw new Error('useFollowedArtists must be used within a FollowedArtistsProvider');
  }
  return ctx;
};
