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

// Liked-albums store. Companion to FavoritesContext (which holds liked tracks).
// Persisted to `octavia.liked-albums.v1`.
const STORAGE_KEY = 'octavia.liked-albums.v1';
const LIKED_ALBUMS_QUERY_KEY = ['me', 'liked-albums'];

const LikedAlbumsContext = createContext(undefined);

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
  const isAuthenticated = Boolean(user);
  const queryClient = useQueryClient();
  const mergedUserRef = useRef(null);
  const [guestLiked, setGuestLiked] = useState(() => readFromStorage());

  const likedQuery = useQuery({
    queryKey: LIKED_ALBUMS_QUERY_KEY,
    enabled: isAuthenticated,
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

  useEffect(() => {
    if (isAuthenticated || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(guestLiked));
    } catch {
      /* quota — ignore */
    }
  }, [guestLiked, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      mergedUserRef.current = null;
      setGuestLiked(readFromStorage());
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !likedQuery.isSuccess) return;
    const userId = user?.id || user?._id;
    if (!userId || mergedUserRef.current === userId) return;

    let active = true;
    const mergeGuestLikedAlbums = async () => {
      const guestMap = readFromStorage();
      const guestItems = Object.values(guestMap || {});
      if (guestItems.length === 0) {
        mergedUserRef.current = userId;
        return;
      }

      const serverMap = likedQuery.data || {};
      const toMerge = guestItems.filter((item) => item?.id && !serverMap[item.id]);
      let mergeSucceeded = true;
      for (const item of toMerge) {
        try {
          await api.post('/me/liked-albums', { album: item });
        } catch {
          mergeSucceeded = false;
          break;
        }
      }

      if (!active) return;
      await queryClient.invalidateQueries({ queryKey: LIKED_ALBUMS_QUERY_KEY });
      if (mergeSucceeded) {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* noop */
        }
        setGuestLiked({});
      }
      mergedUserRef.current = userId;
    };

    void mergeGuestLikedAlbums();

    return () => {
      active = false;
    };
  }, [isAuthenticated, likedQuery.data, likedQuery.isSuccess, queryClient, user?.id, user?._id]);

  const liked = isAuthenticated ? likedQuery.data || {} : guestLiked;

  const isLiked = useCallback((id) => Boolean(id && liked[id]), [liked]);

  const toggleLiked = useCallback((album) => {
    if (!album?.id) return false;

    if (!isAuthenticated) {
      let didAdd = false;
      setGuestLiked((prev) => {
        const next = { ...prev };
        if (next[album.id]) {
          delete next[album.id];
          didAdd = false;
        } else {
          next[album.id] = toLikedShape(album);
          didAdd = true;
        }
        return next;
      });
      return didAdd;
    }

    const prev = queryClient.getQueryData(LIKED_ALBUMS_QUERY_KEY) || {};
    const exists = Boolean(prev[album.id]);
    const next = { ...prev };
    if (exists) {
      delete next[album.id];
      queryClient.setQueryData(LIKED_ALBUMS_QUERY_KEY, next);
      removeLikedMutation.mutate(album.id, {
        onError: () => queryClient.setQueryData(LIKED_ALBUMS_QUERY_KEY, prev),
      });
      return false;
    }

    next[album.id] = toLikedShape(album);
    queryClient.setQueryData(LIKED_ALBUMS_QUERY_KEY, next);
    addLikedMutation.mutate(next[album.id], {
      onError: () => queryClient.setQueryData(LIKED_ALBUMS_QUERY_KEY, prev),
    });
    return true;
  }, [addLikedMutation, isAuthenticated, queryClient, removeLikedMutation]);

  const removeLiked = useCallback((id) => {
    if (!id) return;

    if (!isAuthenticated) {
      setGuestLiked((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    const prev = queryClient.getQueryData(LIKED_ALBUMS_QUERY_KEY) || {};
    if (!prev[id]) return;
    const next = { ...prev };
    delete next[id];
    queryClient.setQueryData(LIKED_ALBUMS_QUERY_KEY, next);
    removeLikedMutation.mutate(id, {
      onError: () => queryClient.setQueryData(LIKED_ALBUMS_QUERY_KEY, prev),
    });
  }, [isAuthenticated, queryClient, removeLikedMutation]);

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
