import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DiscoverRibbon from '@/components/home/DiscoverRibbon';

const sampleTracks = [
  { id: 'a', videoId: 'aaaaaaaaaaa', title: 'A', artist: 'Alpha' },
  { id: 'b', videoId: 'bbbbbbbbbbb', title: 'B', artist: 'Beta' },
  { id: 'c', videoId: 'ccccccccccc', title: 'C', artist: 'Gamma' },
];

const renderRibbon = (props = {}) => {
  const onPlayTrack = props.onPlayTrack || vi.fn();
  const onPlayTracks = props.onPlayTracks || vi.fn();
  const onSurprise = props.onSurprise;
  render(
    <MemoryRouter>
      <DiscoverRibbon
        trending={props.trending || sampleTracks}
        onPlayTrack={onPlayTrack}
        onPlayTracks={onPlayTracks}
        onSurprise={onSurprise}
        surpriseLoading={Boolean(props.surpriseLoading)}
        isLoading={Boolean(props.isLoading)}
      />
    </MemoryRouter>,
  );
  return { onPlayTrack, onPlayTracks, onSurprise };
};

describe('DiscoverRibbon', () => {
  it('routes mood chips to Explore mood deep links', () => {
    renderRibbon();
    expect(screen.getByRole('link', { name: /focus/i })).toHaveAttribute('href', '/explore?mood=focus');
    expect(screen.getByRole('link', { name: /morning/i })).toHaveAttribute('href', '/explore?mood=morning');
  });

  it('plays a shuffled discover mix with queue replace options', () => {
    const { onPlayTracks } = renderRibbon();
    fireEvent.click(screen.getByRole('button', { name: /play discover mix/i }));

    expect(onPlayTracks).toHaveBeenCalledTimes(1);
    const [tracks, options] = onPlayTracks.mock.calls[0];
    expect(Array.isArray(tracks)).toBe(true);
    expect(tracks).toHaveLength(sampleTracks.length);
    expect(options).toEqual({ replaceQueue: true, forceSequential: false });
  });

  it('surprise me picks one track and calls onPlayTrack', () => {
    const { onPlayTrack } = renderRibbon();
    fireEvent.click(screen.getByRole('button', { name: /surprise me/i }));

    expect(onPlayTrack).toHaveBeenCalledTimes(1);
    const picked = onPlayTrack.mock.calls[0][0];
    expect(sampleTracks.some((track) => track.id === picked?.id)).toBe(true);
  });

  it('uses async surprise handler when provided', () => {
    const onSurprise = vi.fn();
    const onPlayTrack = vi.fn();
    renderRibbon({ trending: [], onSurprise, onPlayTrack });
    fireEvent.click(screen.getByRole('button', { name: /surprise me/i }));

    expect(onSurprise).toHaveBeenCalledTimes(1);
    expect(onPlayTrack).not.toHaveBeenCalled();
  });

  it('keeps surprise button disabled while loading', () => {
    renderRibbon({ trending: [], onSurprise: vi.fn(), surpriseLoading: true });
    expect(screen.getByRole('button', { name: /surprise me/i })).toBeDisabled();
  });
});
