import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sanitizeTrack } from '@/lib/media-sanitize';
import { artistSlugOf } from '@/lib/slug';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'octavia.favorites.v1';
const FAVORITES_QUERY_KEY = ['me', 'favorites'];

// Stored shape — kept stable since favourites are persisted in localStorage.
// `artistSlug` and `albumId` were added later; older blobs lack them and are
// healed on read.
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

const readFromStorage = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const sanitizeFavoritesMap = (value) => {
  if (!value || typeof value !== 'object') return {};

  return Object.values(value).reduce((acc, raw) => {
    const track = sanitizeTrack(raw, { requirePlayable: true });
    if (!track?.id) return acc;
    // Preserve fields beyond what `sanitizeTrack` strictly returns, so
    // existing favorites with `artistId`/`artistSlug`/`albumId` survive.
    acc[track.id] = toFavoriteShape({ ...raw, ...track }, raw?.addedAt);
    return acc;
  }, {});
};

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
  const isAuthenticated = Boolean(user);
  const queryClient = useQueryClient();
  const mergedUserRef = useRef(null);
  const [guestFavorites, setGuestFavorites] = useState(() =>
    sanitizeFavoritesMap(readFromStorage()),
  );

  const favoritesQuery = useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    enabled: isAuthenticated,
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

  useEffect(() => {
    if (isAuthenticated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(guestFavorites));
    } catch {
      /* quota exceeded or storage disabled — ignore */
    }
  }, [guestFavorites, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      mergedUserRef.current = null;
      setGuestFavorites(sanitizeFavoritesMap(readFromStorage()));
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !favoritesQuery.isSuccess) return;
    const userId = user?.id || user?._id;
    if (!userId || mergedUserRef.current === userId) return;

    let active = true;
    const mergeGuestFavorites = async () => {
      const guestMap = sanitizeFavoritesMap(readFromStorage());
      const guestItems = Object.values(guestMap);
      if (guestItems.length === 0) {
        mergedUserRef.current = userId;
        return;
      }

      const serverMap = favoritesQuery.data || {};
      const toMerge = guestItems.filter((row) => !serverMap[row.id]);
      let mergeSucceeded = true;

      for (const item of toMerge) {
        try {
          // Preserve server records for duplicates by id; only insert missing rows.
          await api.post('/me/favorites', { track: item });
        } catch {
          mergeSucceeded = false;
          break;
        }
      }

      if (!active) return;

      await queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY });
      if (mergeSucceeded) {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* noop */
        }
        setGuestFavorites({});
      }
      mergedUserRef.current = userId;
    };

    void mergeGuestFavorites();

    return () => {
      active = false;
    };
  }, [favoritesQuery.data, favoritesQuery.isSuccess, isAuthenticated, queryClient, user?.id, user?._id]);

  const favorites = isAuthenticated ? favoritesQuery.data || {} : guestFavorites;

  const toggleFavorite = useCallback((track) => {
    const safeTrack = sanitizeTrack(track, { requirePlayable: true });
    if (!safeTrack?.id) return false;

    if (!isAuthenticated) {
      let didAdd = false;
      setGuestFavorites((prev) => {
        const next = { ...prev };
        if (next[safeTrack.id]) {
          delete next[safeTrack.id];
          didAdd = false;
        } else {
          next[safeTrack.id] = toFavoriteShape({ ...track, ...safeTrack }, Date.now());
          didAdd = true;
        }
        return next;
      });
      return didAdd;
    }

    const prev = queryClient.getQueryData(FAVORITES_QUERY_KEY) || {};
    const exists = Boolean(prev[safeTrack.id]);
    const next = { ...prev };
    if (exists) {
      delete next[safeTrack.id];
      queryClient.setQueryData(FAVORITES_QUERY_KEY, next);
      removeFavoriteMutation.mutate(safeTrack.id, {
        onError: () => queryClient.setQueryData(FAVORITES_QUERY_KEY, prev),
      });
      return false;
    }

    next[safeTrack.id] = toFavoriteShape({ ...track, ...safeTrack }, Date.now());
    queryClient.setQueryData(FAVORITES_QUERY_KEY, next);
    addFavoriteMutation.mutate(next[safeTrack.id], {
      onError: () => queryClient.setQueryData(FAVORITES_QUERY_KEY, prev),
    });
    return true;
  }, [addFavoriteMutation, isAuthenticated, queryClient, removeFavoriteMutation]);

  const removeFavorite = useCallback((id) => {
    if (!id) return;

    if (!isAuthenticated) {
      setGuestFavorites((prev) => {
        if (!prev[id]) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
      return;
    }

    const prev = queryClient.getQueryData(FAVORITES_QUERY_KEY) || {};
    if (!prev[id]) return;
    const next = { ...prev };
    delete next[id];
    queryClient.setQueryData(FAVORITES_QUERY_KEY, next);
    removeFavoriteMutation.mutate(id, {
      onError: () => queryClient.setQueryData(FAVORITES_QUERY_KEY, prev),
    });
  }, [isAuthenticated, queryClient, removeFavoriteMutation]);

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
