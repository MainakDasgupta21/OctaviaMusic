import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { sanitizeTrack } from '@/lib/media-sanitize';
import { artistSlugOf } from '@/lib/slug';

const STORAGE_KEY = 'octavia.favorites.v1';

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

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState(() => sanitizeFavoritesMap(readFromStorage()));

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      /* quota exceeded or storage disabled — ignore */
    }
  }, [favorites]);

  const toggleFavorite = useCallback((track) => {
    const safeTrack = sanitizeTrack(track, { requirePlayable: true });
    if (!safeTrack?.id) return false;
    let didAdd = false;
    setFavorites((prev) => {
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
  }, []);

  const removeFavorite = useCallback((id) => {
    setFavorites((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

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
