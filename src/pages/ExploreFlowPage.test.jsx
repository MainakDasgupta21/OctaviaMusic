import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ExploreFlowPage from '@/pages/ExploreFlowPage';

const mocks = vi.hoisted(() => ({
  playTrack: vi.fn(),
  toggleFavorite: vi.fn(),
  isFavorite: vi.fn(() => false),
  recordFeedback: vi.fn(),
  applyEvent: vi.fn(),
  markPlayed: vi.fn(),
  saveTop: vi.fn(),
  skipTop: vi.fn(),
  loadMore: vi.fn(),
  useExploreData: vi.fn(),
  useDiscoveryFeed: vi.fn(),
  getSeenTrackSet: vi.fn(() => new Set()),
  getArtistFatigueMap: vi.fn(() => new Map()),
}));

vi.mock('@/contexts/PlayerContext', () => ({
  usePlayer: () => ({
    history: [],
    playTrack: mocks.playTrack,
  }),
}));

vi.mock('@/contexts/FavoritesContext', () => ({
  useFavorites: () => ({
    list: [],
    toggleFavorite: mocks.toggleFavorite,
    isFavorite: mocks.isFavorite,
  }),
}));

vi.mock('@/contexts/FollowedArtistsContext', () => ({
  useFollowedArtists: () => ({ list: [] }),
}));

vi.mock('@/hooks/useExploreData', () => ({
  __esModule: true,
  default: (...args) => mocks.useExploreData(...args),
}));

vi.mock('@/hooks/useExploreTaste', () => ({
  __esModule: true,
  default: () => ({
    tasteSeed: { moodId: 'focus', genreId: null },
    tasteProfile: { moodId: 'focus' },
    recordFeedback: mocks.recordFeedback,
  }),
}));

vi.mock('@/hooks/useExploreProgress', () => ({
  __esModule: true,
  default: () => ({
    applyEvent: mocks.applyEvent,
  }),
}));

vi.mock('@/hooks/useInfiniteDiscovery', () => ({
  __esModule: true,
  default: () => ({
    deck: [
      {
        id: 'd1',
        videoId: 'd1',
        title: 'Deck Track',
        artist: 'Deck Artist',
        thumbnail: '/placeholders/track.svg',
      },
    ],
    currentTrack: {
      id: 'd1',
      videoId: 'd1',
      title: 'Deck Track',
      artist: 'Deck Artist',
      thumbnail: '/placeholders/track.svg',
    },
    stats: { plays: 0, saves: 0, skips: 0, swipes: 0 },
    isLoading: false,
    markPlayed: mocks.markPlayed,
    saveTop: mocks.saveTop,
    skipTop: mocks.skipTop,
    loadMore: mocks.loadMore,
  }),
}));

vi.mock('@/hooks/useDiscoveryFeed', () => ({
  __esModule: true,
  default: (...args) => mocks.useDiscoveryFeed(...args),
}));

vi.mock('@/lib/discovery-memory', () => ({
  __esModule: true,
  getSeenTrackSet: (...args) => mocks.getSeenTrackSet(...args),
  getArtistFatigueMap: (...args) => mocks.getArtistFatigueMap(...args),
  subscribeDiscoveryMemory: () => () => {},
}));

describe('ExploreFlowPage', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => {
      if (typeof fn?.mockReset === 'function') fn.mockReset();
    });
    mocks.isFavorite.mockReturnValue(false);
    mocks.getSeenTrackSet.mockReturnValue(new Set());
    mocks.getArtistFatigueMap.mockReturnValue(new Map());
    mocks.useDiscoveryFeed.mockReturnValue({
      freshPool: [],
      byStrategy: [],
      isLoading: false,
      isRefreshing: false,
      error: null,
      refresh: vi.fn(),
      usedStrategies: [],
    });
    mocks.useExploreData.mockReturnValue({
      candidatePool: [
        {
          id: 'l1',
          videoId: 'l1',
          title: 'Pool Track',
          artist: 'Pool Artist',
          thumbnail: '/placeholders/track.svg',
        },
      ],
    });
  });

  it('renders flow shell and drives play/save/skip actions', () => {
    render(
      <MemoryRouter initialEntries={['/explore/flow?mood=focus']}>
        <Routes>
          <Route path="/explore/flow" element={<ExploreFlowPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/continuous discovery tuned/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    fireEvent.click(screen.getByRole('button', { name: /skip/i }));

    expect(mocks.playTrack).toHaveBeenCalled();
    expect(mocks.recordFeedback).toHaveBeenCalled();
    expect(mocks.applyEvent).toHaveBeenCalled();
    expect(mocks.saveTop).toHaveBeenCalled();
    expect(mocks.skipTop).toHaveBeenCalled();
  });

  it('passes discovery-enriched args into useExploreData', () => {
    render(
      <MemoryRouter initialEntries={['/explore/flow?mood=focus&genre=indie&seed=test-seed']}>
        <Routes>
          <Route path="/explore/flow" element={<ExploreFlowPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(mocks.useExploreData).toHaveBeenCalled();
    const args = mocks.useExploreData.mock.calls[0]?.[0] || {};
    expect(args).toHaveProperty('freshPool');
    expect(args).toHaveProperty('excludeIds');
    expect(args).toHaveProperty('discoverySeed');
    expect(args).toHaveProperty('artistFatigue');
  });
});
