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

const STORAGE_KEY = 'octavia.playlists.v1';
const PLAYLISTS_QUERY_KEY = ['me', 'playlists'];

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
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);
  const queryClient = useQueryClient();
  const mergedUserRef = useRef(null);
  const [guestPlaylists, setGuestPlaylists] = useState(() => readFromStorage());

  const playlistsQuery = useQuery({
    queryKey: PLAYLISTS_QUERY_KEY,
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await api.get('/me/playlists');
      return Array.isArray(response.data?.items) ? response.data.items : [];
    },
    staleTime: 30000,
  });

  const createPlaylistMutation = useMutation({
    mutationFn: async (payload) => {
      await api.post('/me/playlists', payload);
    },
  });
  const updatePlaylistMutation = useMutation({
    mutationFn: async ({ id, patch }) => {
      await api.patch(`/me/playlists/${encodeURIComponent(id)}`, patch);
    },
  });
  const deletePlaylistMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/me/playlists/${encodeURIComponent(id)}`);
    },
  });
  const addTrackMutation = useMutation({
    mutationFn: async ({ playlistId, track }) => {
      await api.post(`/me/playlists/${encodeURIComponent(playlistId)}/tracks`, { track });
    },
  });
  const removeTrackMutation = useMutation({
    mutationFn: async ({ playlistId, trackId }) => {
      await api.delete(`/me/playlists/${encodeURIComponent(playlistId)}/tracks`, {
        data: { trackId },
      });
    },
  });
  const reorderTracksMutation = useMutation({
    mutationFn: async ({ playlistId, trackIds }) => {
      await api.patch(`/me/playlists/${encodeURIComponent(playlistId)}/tracks`, { trackIds });
    },
  });

  useEffect(() => {
    if (isAuthenticated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(guestPlaylists));
    } catch {
      /* noop */
    }
  }, [guestPlaylists, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      mergedUserRef.current = null;
      setGuestPlaylists(readFromStorage());
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !playlistsQuery.isSuccess) return;
    const userId = user?.id || user?._id;
    if (!userId || mergedUserRef.current === userId) return;

    let active = true;
    const mergeGuestPlaylists = async () => {
      const guestRows = Array.isArray(readFromStorage()) ? readFromStorage() : [];
      if (guestRows.length === 0) {
        mergedUserRef.current = userId;
        return;
      }

      const existingIds = new Set((playlistsQuery.data || []).map((playlist) => playlist.id));
      const toMerge = guestRows.filter((playlist) => playlist?.id && !existingIds.has(playlist.id));

      let mergeSucceeded = true;
      for (const playlist of toMerge) {
        try {
          await api.post('/me/playlists', {
            id: playlist.id,
            name: playlist.name,
            description: playlist.description || '',
            tracks: Array.isArray(playlist.tracks) ? playlist.tracks : [],
            pinned: Boolean(playlist.pinned),
          });
        } catch {
          mergeSucceeded = false;
          break;
        }
      }

      if (!active) return;

      await queryClient.invalidateQueries({ queryKey: PLAYLISTS_QUERY_KEY });
      if (mergeSucceeded) {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* noop */
        }
        setGuestPlaylists([]);
      }
      mergedUserRef.current = userId;
    };

    void mergeGuestPlaylists();

    return () => {
      active = false;
    };
  }, [isAuthenticated, playlistsQuery.data, playlistsQuery.isSuccess, queryClient, user?.id, user?._id]);

  const playlists = isAuthenticated ? playlistsQuery.data || [] : guestPlaylists;

  const updatePlaylistCollection = useCallback((updater) => {
    if (!isAuthenticated) {
      setGuestPlaylists((current) => updater(Array.isArray(current) ? current : []));
      return;
    }
    queryClient.setQueryData(PLAYLISTS_QUERY_KEY, (current) =>
      updater(Array.isArray(current) ? current : []));
  }, [isAuthenticated, queryClient]);

  const createPlaylist = useCallback(
    ({ name = 'New playlist', description = '', tracks = [], pinned = false } = {}) => {
      const id = newId();
      const now = Date.now();
      const draft = { id, name, description, tracks, pinned, createdAt: now, updatedAt: now };
      const previous = queryClient.getQueryData(PLAYLISTS_QUERY_KEY) || [];

      updatePlaylistCollection((rows) => [...rows, draft]);

      if (isAuthenticated) {
        createPlaylistMutation.mutate(draft, {
          onError: () => queryClient.setQueryData(PLAYLISTS_QUERY_KEY, previous),
        });
      }
      return id;
    },
    [createPlaylistMutation, isAuthenticated, queryClient, updatePlaylistCollection],
  );

  const deletePlaylist = useCallback((id) => {
    const previous = queryClient.getQueryData(PLAYLISTS_QUERY_KEY) || [];
    updatePlaylistCollection((rows) => rows.filter((entry) => entry.id !== id));
    if (isAuthenticated) {
      deletePlaylistMutation.mutate(id, {
        onError: () => queryClient.setQueryData(PLAYLISTS_QUERY_KEY, previous),
      });
    }
  }, [deletePlaylistMutation, isAuthenticated, queryClient, updatePlaylistCollection]);

  const updatePlaylist = useCallback((id, patch) => {
    const previous = queryClient.getQueryData(PLAYLISTS_QUERY_KEY) || [];
    updatePlaylistCollection((rows) =>
      rows.map((entry) =>
        entry.id === id ? { ...entry, ...patch, updatedAt: Date.now() } : entry),
    );
    if (isAuthenticated) {
      updatePlaylistMutation.mutate({ id, patch }, {
        onError: () => queryClient.setQueryData(PLAYLISTS_QUERY_KEY, previous),
      });
    }
  }, [isAuthenticated, queryClient, updatePlaylistCollection, updatePlaylistMutation]);

  const addTrackToPlaylist = useCallback((playlistId, track) => {
    if (!track?.id) return;
    const previous = queryClient.getQueryData(PLAYLISTS_QUERY_KEY) || [];
    updatePlaylistCollection((rows) =>
      rows.map((entry) => {
        if (entry.id !== playlistId) return entry;
        if (entry.tracks.some((item) => item.id === track.id)) return entry;
        return { ...entry, tracks: [...entry.tracks, track], updatedAt: Date.now() };
      }),
    );
    if (isAuthenticated) {
      addTrackMutation.mutate({ playlistId, track }, {
        onError: () => queryClient.setQueryData(PLAYLISTS_QUERY_KEY, previous),
      });
    }
  }, [addTrackMutation, isAuthenticated, queryClient, updatePlaylistCollection]);

  const removeTrackFromPlaylist = useCallback((playlistId, trackId) => {
    const previous = queryClient.getQueryData(PLAYLISTS_QUERY_KEY) || [];
    updatePlaylistCollection((rows) =>
      rows.map((entry) =>
        entry.id === playlistId
          ? {
              ...entry,
              tracks: entry.tracks.filter((item) => item.id !== trackId),
              updatedAt: Date.now(),
            }
          : entry),
    );
    if (isAuthenticated) {
      removeTrackMutation.mutate({ playlistId, trackId }, {
        onError: () => queryClient.setQueryData(PLAYLISTS_QUERY_KEY, previous),
      });
    }
  }, [isAuthenticated, queryClient, removeTrackMutation, updatePlaylistCollection]);

  const reorderTracks = useCallback((playlistId, fromIdx, toIdx) => {
    const previous = queryClient.getQueryData(PLAYLISTS_QUERY_KEY) || [];
    let reorderedTrackIds = null;
    updatePlaylistCollection((rows) =>
      rows.map((entry) => {
        if (entry.id !== playlistId) return entry;
        const nextTracks = [...entry.tracks];
        const [moved] = nextTracks.splice(fromIdx, 1);
        if (!moved) return entry;
        nextTracks.splice(toIdx, 0, moved);
        reorderedTrackIds = nextTracks.map((item) => item.id);
        return { ...entry, tracks: nextTracks, updatedAt: Date.now() };
      }),
    );
    if (isAuthenticated && Array.isArray(reorderedTrackIds)) {
      reorderTracksMutation.mutate({ playlistId, trackIds: reorderedTrackIds }, {
        onError: () => queryClient.setQueryData(PLAYLISTS_QUERY_KEY, previous),
      });
    }
  }, [isAuthenticated, queryClient, reorderTracksMutation, updatePlaylistCollection]);

  const togglePin = useCallback((id) => {
    const previous = queryClient.getQueryData(PLAYLISTS_QUERY_KEY) || [];
    let nextPinned = null;
    updatePlaylistCollection((rows) =>
      rows.map((entry) => {
        if (entry.id !== id) return entry;
        nextPinned = !entry.pinned;
        return { ...entry, pinned: nextPinned, updatedAt: Date.now() };
      }),
    );
    if (isAuthenticated && typeof nextPinned === 'boolean') {
      updatePlaylistMutation.mutate({ id, patch: { pinned: nextPinned } }, {
        onError: () => queryClient.setQueryData(PLAYLISTS_QUERY_KEY, previous),
      });
    }
  }, [isAuthenticated, queryClient, updatePlaylistCollection, updatePlaylistMutation]);

  const reorderPlaylists = useCallback((fromId, toId) => {
    updatePlaylistCollection((rows) => {
      const fromIdx = rows.findIndex((entry) => entry.id === fromId);
      const toIdx = rows.findIndex((entry) => entry.id === toId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return rows;
      const next = [...rows];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, [updatePlaylistCollection]);

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
