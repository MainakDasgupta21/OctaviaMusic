import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

const STORAGE_KEY = 'harmony.favorites.v1';

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

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState(() => readFromStorage());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      /* quota exceeded or storage disabled — ignore */
    }
  }, [favorites]);

  const toggleFavorite = useCallback((track) => {
    if (!track?.id) return false;
    let didAdd = false;
    setFavorites((prev) => {
      const next = { ...prev };
      if (next[track.id]) {
        delete next[track.id];
        didAdd = false;
      } else {
        next[track.id] = {
          id: track.id,
          videoId: track.videoId,
          title: track.title,
          artist: track.artist,
          thumbnail: track.thumbnail,
          duration: track.duration,
          addedAt: Date.now(),
        };
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
