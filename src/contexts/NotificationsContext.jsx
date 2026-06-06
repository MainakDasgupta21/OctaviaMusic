import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { useFollowedArtists } from '@/contexts/FollowedArtistsContext';
import { useLikedAlbums } from '@/contexts/LikedAlbumsContext';
import { usePlaylists } from '@/contexts/PlaylistContext';

// =============================================================================
// NotificationsContext — minimal in-app activity feed.
// -----------------------------------------------------------------------------
// Wires the existing `notifyNewReleases` / `notifyPlaylistUpdates` settings to
// real events that already happen client-side: following an artist, liking an
// album, and changes to playlist counts. The TopBar bell reads `unreadCount`
// to render a pulse; the popover lists `items` and supports mark-all-read.
//
// Persisted to `localStorage` so notifications survive reloads but are still
// scoped to the device (we don't sync across devices).
// =============================================================================

const STORAGE_KEY = 'octavia.notifications.v1';
const MAX_ITEMS = 30;

const readFromStorage = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeToStorage = (items) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    /* localStorage may be unavailable in incognito */
  }
};

const NotificationsContext = createContext({
  items: [],
  unreadCount: 0,
  add: () => {},
  markAllRead: () => {},
  clear: () => {},
});

export const NotificationsProvider = ({ children }) => {
  const { settings } = useSettings();
  const { list: followedArtists } = useFollowedArtists();
  const { list: likedAlbums } = useLikedAlbums();
  const { playlists } = usePlaylists();

  const [items, setItems] = useState(() => readFromStorage());
  useEffect(() => writeToStorage(items), [items]);

  const add = useCallback((entry) => {
    if (!entry || !entry.title) return;
    const id = entry.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const ts = entry.timestamp || Date.now();
    setItems((prev) => {
      // Dedupe by id — the trackers below run on every render, so without
      // this the same artist-followed event would post on every commit.
      if (prev.some((n) => n.id === id)) return prev;
      return [{ ...entry, id, timestamp: ts, read: false }, ...prev].slice(0, MAX_ITEMS);
    });
  }, []);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => (n.read ? n : { ...n, read: true })));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  // -------------------------------------------------------------------------
  // Auto-tracking. Compare counts between renders so we don't replay history
  // every refresh. Refs hold the previous count; the first render seeds the
  // ref so a fresh install doesn't fire spurious "you followed N artists".
  // -------------------------------------------------------------------------

  const prevArtistsRef = useRef(null);
  useEffect(() => {
    if (!settings.notifyNewReleases) {
      prevArtistsRef.current = followedArtists.length;
      return;
    }
    const prev = prevArtistsRef.current;
    if (prev === null) {
      prevArtistsRef.current = followedArtists.length;
      return;
    }
    if (followedArtists.length > prev) {
      const latest = followedArtists[0];
      if (latest) {
        add({
          id: `follow-${latest.id || latest.slug}-${latest.followedAt || ''}`,
          kind: 'follow',
          title: `You're now following ${latest.name}`,
          description: 'New releases from this artist will surface here.',
          to: `/artist/${latest.slug || latest.id}`,
        });
      }
    }
    prevArtistsRef.current = followedArtists.length;
  }, [followedArtists, settings.notifyNewReleases, add]);

  const prevAlbumsRef = useRef(null);
  useEffect(() => {
    if (!settings.notifyNewReleases) {
      prevAlbumsRef.current = likedAlbums.length;
      return;
    }
    const prev = prevAlbumsRef.current;
    if (prev === null) {
      prevAlbumsRef.current = likedAlbums.length;
      return;
    }
    if (likedAlbums.length > prev) {
      const latest = likedAlbums[0];
      if (latest) {
        add({
          id: `album-${latest.id}-${latest.likedAt || ''}`,
          kind: 'album',
          title: `Saved ${latest.title}`,
          description: `Liked albums are reachable from your library.`,
          to: `/album/${latest.id}`,
        });
      }
    }
    prevAlbumsRef.current = likedAlbums.length;
  }, [likedAlbums, settings.notifyNewReleases, add]);

  const prevPlaylistsRef = useRef(null);
  useEffect(() => {
    if (!settings.notifyPlaylistUpdates) {
      prevPlaylistsRef.current = playlists.length;
      return;
    }
    const prev = prevPlaylistsRef.current;
    if (prev === null) {
      prevPlaylistsRef.current = playlists.length;
      return;
    }
    if (playlists.length > prev) {
      const latest = playlists[0];
      if (latest) {
        add({
          id: `playlist-${latest.id}`,
          kind: 'playlist',
          title: `Playlist created: ${latest.name}`,
          description: 'Add songs to it from the song context menu.',
          to: `/playlist/${latest.id}`,
        });
      }
    }
    prevPlaylistsRef.current = playlists.length;
  }, [playlists, settings.notifyPlaylistUpdates, add]);

  const unreadCount = useMemo(
    () => items.reduce((n, item) => (item.read ? n : n + 1), 0),
    [items],
  );

  const value = useMemo(
    () => ({ items, unreadCount, add, markAllRead, clear }),
    [items, unreadCount, add, markAllRead, clear],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationsContext);

export default NotificationsContext;
