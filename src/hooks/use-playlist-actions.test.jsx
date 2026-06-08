import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlaylistProvider } from '@/contexts/PlaylistContext';
import usePlaylistActions from '@/hooks/use-playlist-actions';

const wrapper = ({ children }) => (
  <MemoryRouter>
    <PlaylistProvider>{children}</PlaylistProvider>
  </MemoryRouter>
);

const sampleTrack = {
  id: 'track-1',
  title: 'Midnight City',
  artist: 'M83',
  videoId: 'yt-1',
  thumbnail: '/cover.jpg',
  duration: '4:03',
};

describe('usePlaylistActions', () => {
  beforeEach(() => {
    window.localStorage.removeItem('octavia.playlists.v1');
  });

  it('creates a playlist seeded from a track', () => {
    const { result } = renderHook(() => usePlaylistActions(), { wrapper });

    let createdId;
    act(() => {
      createdId = result.current.createPlaylistFromTrack({
        track: sampleTrack,
        navigateTo: false,
        notifyOnCreate: false,
      });
    });

    const created = result.current.playlists.find((playlist) => playlist.id === createdId);
    expect(created).toBeTruthy();
    expect(created.name).toBe(sampleTrack.title);
    expect(created.tracks).toHaveLength(1);
    expect(created.tracks[0].id).toBe(sampleTrack.id);
  });

  it('dedupes when adding the same song twice', () => {
    const { result } = renderHook(() => usePlaylistActions(), { wrapper });

    let playlistId;
    act(() => {
      playlistId = result.current.createEmptyPlaylist({
        name: 'Focus Session',
        navigateTo: false,
        notifyOnCreate: false,
      });
    });

    let playlist = result.current.playlists.find((entry) => entry.id === playlistId);
    let firstAdd;
    act(() => {
      firstAdd = result.current.addTrackToPlaylistWithFeedback({
        playlist,
        track: sampleTrack,
        notifyOnAdded: false,
        notifyOnDuplicate: false,
      });
    });
    expect(firstAdd.status).toBe('added');

    playlist = result.current.playlists.find((entry) => entry.id === playlistId);
    let duplicateAdd;
    act(() => {
      duplicateAdd = result.current.addTrackToPlaylistWithFeedback({
        playlist,
        track: sampleTrack,
        notifyOnAdded: false,
        notifyOnDuplicate: false,
      });
    });

    expect(duplicateAdd.status).toBe('duplicate');
    expect(
      result.current.playlists.find((entry) => entry.id === playlistId)?.tracks || [],
    ).toHaveLength(1);
  });
});
