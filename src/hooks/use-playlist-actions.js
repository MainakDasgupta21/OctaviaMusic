import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePlaylists } from '@/contexts/PlaylistContext';
import notify from '@/lib/notify';

const trackTitle = (track) => track?.title || 'Track';

export const usePlaylistActions = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);
  const { playlists, createPlaylist, addTrackToPlaylist } = usePlaylists();

  const orderedPlaylists = useMemo(
    () =>
      [...playlists].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        const byUpdated = (b.updatedAt || 0) - (a.updatedAt || 0);
        if (byUpdated !== 0) return byUpdated;
        return (a.name || '').localeCompare(b.name || '');
      }),
    [playlists],
  );

  const isTrackInPlaylist = useCallback((playlist, track) => {
    if (!playlist?.id || !track?.id) return false;
    return Array.isArray(playlist.tracks) && playlist.tracks.some((item) => item.id === track.id);
  }, []);

  const addTrackToPlaylistWithFeedback = useCallback(
    ({ playlist, track, notifyOnAdded = true, notifyOnDuplicate = true } = {}) => {
      if (!playlist?.id || !track?.id) return { status: 'invalid' };
      if (!isAuthenticated) return { status: 'unauthenticated' };
      if (isTrackInPlaylist(playlist, track)) {
        if (notifyOnDuplicate) notify.info(`Already in ${playlist.name}`);
        return { status: 'duplicate' };
      }

      addTrackToPlaylist(playlist.id, track);
      if (notifyOnAdded) notify.added(`${trackTitle(track)} \u2192 ${playlist.name}`);
      return { status: 'added' };
    },
    [addTrackToPlaylist, isAuthenticated, isTrackInPlaylist],
  );

  const createPlaylistFromTrack = useCallback(
    ({
      track,
      name,
      description = '',
      pinned = true,
      navigateTo = true,
      notifyOnCreate = true,
    } = {}) => {
      if (!track?.id) return null;
      const playlistName = String(name || track.title || 'New playlist').trim() || 'New playlist';
      const id = createPlaylist({
        name: playlistName,
        description,
        tracks: [track],
        pinned,
      });
      if (!id) return null;
      if (notifyOnCreate) notify.added(`Playlist \u2014 ${playlistName}`);
      if (navigateTo) navigate(`/playlist/${id}`);
      return id;
    },
    [createPlaylist, navigate],
  );

  const createEmptyPlaylist = useCallback(
    ({
      name = 'New playlist',
      description = '',
      pinned = true,
      navigateTo = true,
      notifyOnCreate = true,
    } = {}) => {
      const playlistName = String(name || 'New playlist').trim() || 'New playlist';
      const id = createPlaylist({
        name: playlistName,
        description,
        tracks: [],
        pinned,
      });
      if (!id) return null;
      if (notifyOnCreate) notify.added(`Playlist \u2014 ${playlistName}`);
      if (navigateTo) navigate(`/playlist/${id}`);
      return id;
    },
    [createPlaylist, navigate],
  );

  return {
    playlists: orderedPlaylists,
    isTrackInPlaylist,
    addTrackToPlaylistWithFeedback,
    createPlaylistFromTrack,
    createEmptyPlaylist,
  };
};

export default usePlaylistActions;
