import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import notify from '@/lib/notify';

const playlistsQueryKey = (userId) => ['me', 'playlists', userId];

const PlaylistContext = createContext(undefined);

let counter = 0;
const newId = () => `p-${Date.now().toString(36)}-${(++counter).toString(36)}`;

export const PlaylistProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || user?._id || null;
  const queryClient = useQueryClient();
  const queryKey = playlistsQueryKey(userId);

  const playlistsQuery = useQuery({
    queryKey,
    enabled: Boolean(userId),
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

  const playlists = userId ? playlistsQuery.data || [] : [];

  const updatePlaylistCollection = useCallback((updater) => {
    queryClient.setQueryData(queryKey, (current) =>
      updater(Array.isArray(current) ? current : []));
  }, [queryClient, queryKey]);

  const createPlaylist = useCallback(
    ({ name = 'New playlist', description = '', tracks = [], pinned = false } = {}) => {
      if (!userId) {
        notify.signInRequired('create playlists');
        return null;
      }
      const id = newId();
      const now = Date.now();
      const draft = { id, name, description, tracks, pinned, createdAt: now, updatedAt: now };
      const previous = queryClient.getQueryData(queryKey) || [];

      updatePlaylistCollection((rows) => [...rows, draft]);
      createPlaylistMutation.mutate(draft, {
        onError: () => queryClient.setQueryData(queryKey, previous),
      });
      return id;
    },
    [createPlaylistMutation, queryClient, queryKey, updatePlaylistCollection, userId],
  );

  const deletePlaylist = useCallback((id) => {
    if (!userId) {
      notify.signInRequired('manage playlists');
      return;
    }
    const previous = queryClient.getQueryData(queryKey) || [];
    updatePlaylistCollection((rows) => rows.filter((entry) => entry.id !== id));
    deletePlaylistMutation.mutate(id, {
      onError: () => queryClient.setQueryData(queryKey, previous),
    });
  }, [deletePlaylistMutation, queryClient, queryKey, updatePlaylistCollection, userId]);

  const updatePlaylist = useCallback((id, patch) => {
    if (!userId) {
      notify.signInRequired('manage playlists');
      return;
    }
    const previous = queryClient.getQueryData(queryKey) || [];
    updatePlaylistCollection((rows) =>
      rows.map((entry) =>
        entry.id === id ? { ...entry, ...patch, updatedAt: Date.now() } : entry),
    );
    updatePlaylistMutation.mutate({ id, patch }, {
      onError: () => queryClient.setQueryData(queryKey, previous),
    });
  }, [queryClient, queryKey, updatePlaylistCollection, updatePlaylistMutation, userId]);

  const addTrackToPlaylist = useCallback((playlistId, track) => {
    if (!track?.id) return;
    if (!userId) {
      notify.signInRequired('save songs to playlists');
      return;
    }
    const previous = queryClient.getQueryData(queryKey) || [];
    updatePlaylistCollection((rows) =>
      rows.map((entry) => {
        if (entry.id !== playlistId) return entry;
        if (entry.tracks.some((item) => item.id === track.id)) return entry;
        return { ...entry, tracks: [...entry.tracks, track], updatedAt: Date.now() };
      }),
    );
    addTrackMutation.mutate({ playlistId, track }, {
      onError: () => queryClient.setQueryData(queryKey, previous),
    });
  }, [addTrackMutation, queryClient, queryKey, updatePlaylistCollection, userId]);

  const removeTrackFromPlaylist = useCallback((playlistId, trackId) => {
    if (!userId) {
      notify.signInRequired('manage playlists');
      return;
    }
    const previous = queryClient.getQueryData(queryKey) || [];
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
    removeTrackMutation.mutate({ playlistId, trackId }, {
      onError: () => queryClient.setQueryData(queryKey, previous),
    });
  }, [queryClient, queryKey, removeTrackMutation, updatePlaylistCollection, userId]);

  const reorderTracks = useCallback((playlistId, fromIdx, toIdx) => {
    if (!userId) {
      notify.signInRequired('manage playlists');
      return;
    }
    const previous = queryClient.getQueryData(queryKey) || [];
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
    if (Array.isArray(reorderedTrackIds)) {
      reorderTracksMutation.mutate({ playlistId, trackIds: reorderedTrackIds }, {
        onError: () => queryClient.setQueryData(queryKey, previous),
      });
    }
  }, [queryClient, queryKey, reorderTracksMutation, updatePlaylistCollection, userId]);

  const togglePin = useCallback((id) => {
    if (!userId) {
      notify.signInRequired('manage playlists');
      return;
    }
    const previous = queryClient.getQueryData(queryKey) || [];
    let nextPinned = null;
    updatePlaylistCollection((rows) =>
      rows.map((entry) => {
        if (entry.id !== id) return entry;
        nextPinned = !entry.pinned;
        return { ...entry, pinned: nextPinned, updatedAt: Date.now() };
      }),
    );
    if (typeof nextPinned === 'boolean') {
      updatePlaylistMutation.mutate({ id, patch: { pinned: nextPinned } }, {
        onError: () => queryClient.setQueryData(queryKey, previous),
      });
    }
  }, [queryClient, queryKey, updatePlaylistCollection, updatePlaylistMutation, userId]);

  const reorderPlaylists = useCallback((fromId, toId) => {
    if (!userId) {
      notify.signInRequired('manage playlists');
      return;
    }
    updatePlaylistCollection((rows) => {
      const fromIdx = rows.findIndex((entry) => entry.id === fromId);
      const toIdx = rows.findIndex((entry) => entry.id === toId);
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return rows;
      const next = [...rows];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }, [updatePlaylistCollection, userId]);

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
