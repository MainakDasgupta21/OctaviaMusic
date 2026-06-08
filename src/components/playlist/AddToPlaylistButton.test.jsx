import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlaylistProvider, usePlaylists } from '@/contexts/PlaylistContext';
import AddToPlaylistButton from '@/components/playlist/AddToPlaylistButton';

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
  const inLateNightDrive = playlists
    .find((playlist) => playlist.name === 'Late night drive')
    ?.tracks?.some((track) => track.id === sampleTrack.id);

  return (
    <div>
      <AddToPlaylistButton
        track={sampleTrack}
        navigateOnCreate={false}
        buttonLabel="Add sample track to playlist"
      />
      <span data-testid="playlist-count">{playlists.length}</span>
      <span data-testid="in-late-night">{inLateNightDrive ? 'yes' : 'no'}</span>
    </div>
  );
};

const renderHarness = () =>
  render(
    <MemoryRouter>
      <PlaylistProvider>
        <Harness />
      </PlaylistProvider>
    </MemoryRouter>,
  );

describe('AddToPlaylistButton', () => {
  beforeEach(() => {
    window.localStorage.removeItem('octavia.playlists.v1');
  });

  it('creates a new playlist from the current track', () => {
    renderHarness();
    const trigger = screen.getByRole('button', { name: /add sample track to playlist/i });
    const before = Number(screen.getByTestId('playlist-count').textContent);

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: /new playlist/i }));

    const after = Number(screen.getByTestId('playlist-count').textContent);
    expect(after).toBe(before + 1);
  });

  it('adds the track to a selected playlist', () => {
    renderHarness();
    const trigger = screen.getByRole('button', { name: /add sample track to playlist/i });

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: /late night drive/i }));

    expect(screen.getByTestId('in-late-night').textContent).toBe('yes');
  });
});
