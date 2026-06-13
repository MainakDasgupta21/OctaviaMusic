import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PlaylistProvider } from '@/contexts/PlaylistContext';
import usePlaylistActions from '@/hooks/use-playlist-actions';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }) => (
  <MemoryRouter>
    <QueryClientProvider client={queryClient}>
      <PlaylistProvider>{children}</PlaylistProvider>
    </QueryClientProvider>
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
    queryClient.clear();
  });

  it('requires login before creating a playlist', () => {
    const { result } = renderHook(() => usePlaylistActions(), { wrapper });

    let createdId;
    act(() => {
      createdId = result.current.createPlaylistFromTrack({
        track: sampleTrack,
        navigateTo: false,
        notifyOnCreate: false,
      });
    });

    expect(createdId).toBeNull();
    expect(result.current.playlists).toHaveLength(0);
  });

  it('returns unauthenticated when adding to a playlist while signed out', () => {
    const { result } = renderHook(() => usePlaylistActions(), { wrapper });

    let addResult;
    act(() => {
      addResult = result.current.addTrackToPlaylistWithFeedback({
        playlist: { id: 'playlist-1', name: 'Focus Session', tracks: [] },
        track: sampleTrack,
        notifyOnAdded: false,
        notifyOnDuplicate: false,
      });
    });
    expect(addResult.status).toBe('unauthenticated');
  });
});
