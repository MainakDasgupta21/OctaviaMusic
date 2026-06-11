import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// Followed-artists store. Mirrors FavoritesContext but for artist slugs.
// Persisted to `octavia.followed-artists.v1`.
const STORAGE_KEY = 'octavia.followed-artists.v1';
const FOLLOWED_ARTISTS_QUERY_KEY = ['me', 'followed-artists'];

const FollowedArtistsContext = createContext(undefined);

const readFromStorage = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

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
  const isAuthenticated = Boolean(user);
  const queryClient = useQueryClient();
  const mergedUserRef = useRef(null);
  const [guestFollowed, setGuestFollowed] = useState(() => readFromStorage());

  const followedQuery = useQuery({
    queryKey: FOLLOWED_ARTISTS_QUERY_KEY,
    enabled: isAuthenticated,
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

  useEffect(() => {
    if (isAuthenticated || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(guestFollowed));
    } catch {
      /* quota — ignore */
    }
  }, [guestFollowed, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      mergedUserRef.current = null;
      setGuestFollowed(readFromStorage());
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !followedQuery.isSuccess) return;
    const userId = user?.id || user?._id;
    if (!userId || mergedUserRef.current === userId) return;

    let active = true;
    const mergeGuestFollowedArtists = async () => {
      const guestMap = readFromStorage();
      const guestItems = Object.values(guestMap || {});
      if (guestItems.length === 0) {
        mergedUserRef.current = userId;
        return;
      }

      const serverMap = followedQuery.data || {};
      const toMerge = guestItems.filter((item) => {
        const key = followedKey(item);
        return key && !serverMap[key];
      });
      let mergeSucceeded = true;
      for (const item of toMerge) {
        try {
          await api.post('/me/followed-artists', { artist: item });
        } catch {
          mergeSucceeded = false;
          break;
        }
      }

      if (!active) return;
      await queryClient.invalidateQueries({ queryKey: FOLLOWED_ARTISTS_QUERY_KEY });
      if (mergeSucceeded) {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* noop */
        }
        setGuestFollowed({});
      }
      mergedUserRef.current = userId;
    };

    void mergeGuestFollowedArtists();

    return () => {
      active = false;
    };
  }, [followedQuery.data, followedQuery.isSuccess, isAuthenticated, queryClient, user?.id, user?._id]);

  const followed = isAuthenticated ? followedQuery.data || {} : guestFollowed;

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

    if (!isAuthenticated) {
      let didAdd = false;
      setGuestFollowed((prev) => {
        const next = { ...prev };
        if (next[key]) {
          delete next[key];
          didAdd = false;
        } else {
          next[key] = normalized;
          didAdd = true;
        }
        return next;
      });
      return didAdd;
    }

    const prev = queryClient.getQueryData(FOLLOWED_ARTISTS_QUERY_KEY) || {};
    const exists = Boolean(prev[key]);
    const next = { ...prev };
    if (exists) {
      delete next[key];
      queryClient.setQueryData(FOLLOWED_ARTISTS_QUERY_KEY, next);
      removeFollowMutation.mutate(key, {
        onError: () => queryClient.setQueryData(FOLLOWED_ARTISTS_QUERY_KEY, prev),
      });
      return false;
    }

    next[key] = normalized;
    queryClient.setQueryData(FOLLOWED_ARTISTS_QUERY_KEY, next);
    addFollowMutation.mutate(normalized, {
      onError: () => queryClient.setQueryData(FOLLOWED_ARTISTS_QUERY_KEY, prev),
    });
    return true;
  }, [addFollowMutation, isAuthenticated, queryClient, removeFollowMutation]);

  const unfollow = useCallback((slugOrId) => {
    if (!slugOrId) return;

    if (!isAuthenticated) {
      setGuestFollowed((prev) => {
        if (!prev[slugOrId]) return prev;
        const next = { ...prev };
        delete next[slugOrId];
        return next;
      });
      return;
    }

    const prev = queryClient.getQueryData(FOLLOWED_ARTISTS_QUERY_KEY) || {};
    const key = prev[slugOrId]
      ? slugOrId
      : Object.keys(prev).find((entryKey) => prev[entryKey]?.id === slugOrId) || slugOrId;
    if (!prev[key]) return;
    const next = { ...prev };
    delete next[key];
    queryClient.setQueryData(FOLLOWED_ARTISTS_QUERY_KEY, next);
    removeFollowMutation.mutate(prev[key]?.id || slugOrId, {
      onError: () => queryClient.setQueryData(FOLLOWED_ARTISTS_QUERY_KEY, prev),
    });
  }, [isAuthenticated, queryClient, removeFollowMutation]);

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
