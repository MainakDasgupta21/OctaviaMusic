import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

// Liked-albums store. Companion to FavoritesContext (which holds liked tracks).
// Persisted to `octavia.liked-albums.v1`.
const STORAGE_KEY = 'octavia.liked-albums.v1';

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

export const LikedAlbumsProvider = ({ children }) => {
  const [liked, setLiked] = useState(() => readFromStorage());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(liked));
    } catch {
      /* quota — ignore */
    }
  }, [liked]);

  const isLiked = useCallback((id) => Boolean(id && liked[id]), [liked]);

  const toggleLiked = useCallback((album) => {
    if (!album?.id) return false;
    let didAdd = false;
    setLiked((prev) => {
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
  }, []);

  const removeLiked = useCallback((id) => {
    if (!id) return;
    setLiked((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

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
