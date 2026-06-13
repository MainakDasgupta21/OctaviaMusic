import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PlaylistProvider, usePlaylists } from '@/contexts/PlaylistContext';
import AddToPlaylistButton from '@/components/playlist/AddToPlaylistButton';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const sampleTrack = {
  id: 'song-1',
  title: 'Sunset Lover',
  artist: 'Petit Biscuit',
  videoId: 'yt-song-1',
  thumbnail: '/cover.jpg',
  duration: '3:58',
};

const Harness = () => {
  const { playlists } = usePlaylists();

  return (
    <div>
      <AddToPlaylistButton
        track={sampleTrack}
        navigateOnCreate={false}
        buttonLabel="Add sample track to playlist"
      />
      <span data-testid="playlist-count">{playlists.length}</span>
    </div>
  );
};

const renderHarness = () =>
  render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <PlaylistProvider>
          <Harness />
        </PlaylistProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );

describe('AddToPlaylistButton', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('starts with no playlists for signed-out users', () => {
    renderHarness();
    expect(screen.getByTestId('playlist-count').textContent).toBe('0');
  });

  it('does not create a playlist while signed out', () => {
    renderHarness();
    const trigger = screen.getByRole('button', { name: /add sample track to playlist/i });
    const before = Number(screen.getByTestId('playlist-count').textContent);

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: /new playlist/i }));

    const after = Number(screen.getByTestId('playlist-count').textContent);
    expect(after).toBe(before);
  });

  it('shows an empty playlist state in the picker when signed out', () => {
    renderHarness();
    const trigger = screen.getByRole('button', { name: /add sample track to playlist/i });

    fireEvent.click(trigger);
    expect(screen.getByText(/no playlists yet/i)).toBeInTheDocument();
  });
});
