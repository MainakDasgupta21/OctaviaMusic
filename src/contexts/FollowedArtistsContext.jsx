import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

// Followed-artists store. Mirrors FavoritesContext but for artist slugs.
// Persisted to `octavia.followed-artists.v1`.
const STORAGE_KEY = 'octavia.followed-artists.v1';

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

export const FollowedArtistsProvider = ({ children }) => {
  const [followed, setFollowed] = useState(() => readFromStorage());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(followed));
    } catch {
      /* quota — ignore */
    }
  }, [followed]);

  const isFollowing = useCallback(
    (slugOrId) => {
      if (!slugOrId) return false;
      return Boolean(followed[slugOrId]);
    },
    [followed],
  );

  const toggleFollow = useCallback((artist) => {
    if (!artist) return false;
    const key = artist.slug || artist.id;
    if (!key) return false;
    let didAdd = false;
    setFollowed((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
        didAdd = false;
      } else {
        next[key] = toFollowedShape(artist);
        didAdd = true;
      }
      return next;
    });
    return didAdd;
  }, []);

  const unfollow = useCallback((slugOrId) => {
    if (!slugOrId) return;
    setFollowed((prev) => {
      if (!prev[slugOrId]) return prev;
      const next = { ...prev };
      delete next[slugOrId];
      return next;
    });
  }, []);

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
