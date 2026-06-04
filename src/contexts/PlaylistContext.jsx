import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = 'octavia.playlists.v1';

// Seed playlists shown on first load — gives the Library a populated feel
// for new users while real persistence kicks in.
const seedPlaylists = () => [
  {
    id: 'p-seed-1',
    name: 'Late night drive',
    description: 'Synthwave for empty highways.',
    tracks: [],
    pinned: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
  },
  {
    id: 'p-seed-2',
    name: 'Morning focus',
    description: 'Instrumental tracks to start the day.',
    tracks: [],
    pinned: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24,
  },
];

const readFromStorage = () => {
  if (typeof window === 'undefined') return seedPlaylists();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedPlaylists();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedPlaylists();
    return parsed;
  } catch {
    return seedPlaylists();
  }
};

const PlaylistContext = createContext(undefined);

let counter = 0;
const newId = () => `p-${Date.now().toString(36)}-${(++counter).toString(36)}`;

export const PlaylistProvider = ({ children }) => {
  const [playlists, setPlaylists] = useState(() => readFromStorage());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
    } catch {
      /* noop */
    }
  }, [playlists]);

  const createPlaylist = useCallback(
    ({ name = 'New playlist', description = '', tracks = [], pinned = false } = {}) => {
      const id = newId();
      const now = Date.now();
      setPlaylists((p) => [
        ...p,
        { id, name, description, tracks, pinned, createdAt: now, updatedAt: now },
      ]);
      return id;
    },
    [],
  );

  const deletePlaylist = useCallback((id) => {
    setPlaylists((p) => p.filter((x) => x.id !== id));
  }, []);

  const updatePlaylist = useCallback((id, patch) => {
    setPlaylists((p) =>
      p.map((x) =>
        x.id === id ? { ...x, ...patch, updatedAt: Date.now() } : x,
      ),
    );
  }, []);

  const addTrackToPlaylist = useCallback((playlistId, track) => {
    if (!track?.id) return;
    setPlaylists((p) =>
      p.map((x) => {
        if (x.id !== playlistId) return x;
        if (x.tracks.some((t) => t.id === track.id)) return x; // dedupe
        return { ...x, tracks: [...x.tracks, track], updatedAt: Date.now() };
      }),
    );
  }, []);

  const removeTrackFromPlaylist = useCallback((playlistId, trackId) => {
    setPlaylists((p) =>
      p.map((x) =>
        x.id === playlistId
          ? { ...x, tracks: x.tracks.filter((t) => t.id !== trackId), updatedAt: Date.now() }
          : x,
      ),
    );
  }, []);

  const reorderTracks = useCallback((playlistId, fromIdx, toIdx) => {
    setPlaylists((p) =>
      p.map((x) => {
        if (x.id !== playlistId) return x;
        const next = [...x.tracks];
        const [moved] = next.splice(fromIdx, 1);
        if (!moved) return x;
        next.splice(toIdx, 0, moved);
        return { ...x, tracks: next, updatedAt: Date.now() };
      }),
    );
  }, []);

  const togglePin = useCallback((id) => {
    setPlaylists((p) =>
      p.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x)),
    );
  }, []);

  const reorderPlaylists = useCallback((fromId, toId) => {
    setPlaylists((p) => {
      const fromIdx = p.findIndex((x) => x.id === fromId);
      const toIdx = p.findIndex((x) => x.id === toId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return p;
      const next = [...p];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, []);

  const pinned = useMemo(() => playlists.filter((p) => p.pinned), [playlists]);

  const value = useMemo(
    () => ({
      playlists,
      pinned,
      createPlaylist,
      deletePlaylist,
      updatePlaylist,
      addTrackToPlaylist,
      removeTrackFromPlaylist,
      reorderTracks,
      togglePin,
      reorderPlaylists,
    }),
    [
      playlists,
      pinned,
      createPlaylist,
      deletePlaylist,
      updatePlaylist,
      addTrackToPlaylist,
      removeTrackFromPlaylist,
      reorderTracks,
      togglePin,
      reorderPlaylists,
    ],
  );

  return <PlaylistContext.Provider value={value}>{children}</PlaylistContext.Provider>;
};

export const usePlaylists = () => {
  const ctx = useContext(PlaylistContext);
  if (!ctx) throw new Error('usePlaylists must be used within a PlaylistProvider');
  return ctx;
};
