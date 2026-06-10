import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useInfiniteDiscovery from '@/hooks/useInfiniteDiscovery';

const apiMocks = vi.hoisted(() => ({
  getExploreRadio: vi.fn(),
  getExploreSimilar: vi.fn(),
}));

const memoryMocks = vi.hoisted(() => ({
  getSeenTrackSet: vi.fn(() => new Set()),
  markTrackSeen: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  getExploreRadio: (...args) => apiMocks.getExploreRadio(...args),
  getExploreSimilar: (...args) => apiMocks.getExploreSimilar(...args),
}));

vi.mock('@/lib/discovery-memory', () => ({
  __esModule: true,
  getSeenTrackSet: (...args) => memoryMocks.getSeenTrackSet(...args),
  markTrackSeen: (...args) => memoryMocks.markTrackSeen(...args),
  subscribeDiscoveryMemory: () => () => {},
}));

const makeTrack = (id, artist = 'Artist') => ({
  id,
  videoId: id,
  title: `Track ${id}`,
  artist,
  thumbnail: '/placeholders/track.svg',
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useInfiniteDiscovery', () => {
  beforeEach(() => {
    apiMocks.getExploreRadio.mockReset();
    apiMocks.getExploreSimilar.mockReset();
    memoryMocks.getSeenTrackSet.mockReset();
    memoryMocks.markTrackSeen.mockReset();
    memoryMocks.getSeenTrackSet.mockReturnValue(new Set());
    apiMocks.getExploreRadio.mockResolvedValue({
      items: [makeTrack('r1', 'A'), makeTrack('r2', 'B'), makeTrack('r3', 'C')],
    });
    apiMocks.getExploreSimilar.mockResolvedValue({ items: [] });
  });

  it('hydrates deck from radio + local pool', async () => {
    const localPool = [makeTrack('l1', 'D'), makeTrack('l2', 'E')];
    const { result } = renderHook(
      () =>
        useInfiniteDiscovery({
          localPool,
          mood: 'Focus',
          genre: 'Indie',
          seed: 'night',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.deck.length).toBeGreaterThan(0));
    expect(apiMocks.getExploreRadio).toHaveBeenCalledWith(
      expect.objectContaining({ mood: 'focus', genre: 'indie' }),
    );
  });

  it('updates swipe/save counters when consuming top track', async () => {
    const localPool = [makeTrack('l1', 'D')];
    const { result } = renderHook(
      () =>
        useInfiniteDiscovery({
          localPool,
          mood: 'focus',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.deck.length).toBeGreaterThan(0));

    act(() => {
      result.current.saveTop();
    });

    expect(result.current.stats.saves).toBe(1);
    expect(result.current.stats.swipes).toBe(1);
  });

  it('queries similar tracks when current item only has videoId', async () => {
    apiMocks.getExploreRadio.mockResolvedValue({
      items: [
        {
          id: null,
          videoId: 'video-only-1',
          title: 'Video Only One',
          artist: 'Solo',
          thumbnail: '/placeholders/track.svg',
        },
      ],
    });

    renderHook(
      () =>
        useInfiniteDiscovery({
          localPool: [],
          mood: 'focus',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(apiMocks.getExploreSimilar).toHaveBeenCalledWith(
        expect.objectContaining({ trackId: 'video-only-1' }),
      );
    });
  });

  it('resets consumed pool when exhausted so flow can continue', async () => {
    apiMocks.getExploreRadio.mockResolvedValue({ items: [] });
    const localPool = [makeTrack('loop-1', 'A'), makeTrack('loop-2', 'B')];
    const { result } = renderHook(
      () =>
        useInfiniteDiscovery({
          localPool,
          mood: 'focus',
          genre: 'indie',
          seed: 'loop',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.deck.length).toBeGreaterThan(0));

    for (let step = 0; step < 6; step += 1) {
      act(() => {
        result.current.skipTop();
      });
    }
    act(() => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.deck.length).toBeGreaterThan(0);
    });
  });

  it('computes remaining pool using current pool ids, not persisted history size', async () => {
    memoryMocks.getSeenTrackSet.mockReturnValue(
      new Set(Array.from({ length: 250 }, (_, idx) => `seen-${idx}`)),
    );
    apiMocks.getExploreRadio.mockResolvedValue({
      items: Array.from({ length: 30 }, (_, idx) => makeTrack(`r${idx + 1}`, `Artist ${idx % 7}`)),
    });

    const { result } = renderHook(
      () =>
        useInfiniteDiscovery({
          localPool: [],
          mood: 'focus',
          genre: 'ambient',
          seed: 'remaining-check',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.deck.length).toBeGreaterThanOrEqual(10));
    expect(result.current.remainingInPool).toBeGreaterThan(0);
  });

  it('keeps stats when strategy rotates', async () => {
    const nowSpy = vi.spyOn(Date, 'now');
    let now = 1_000_000;
    nowSpy.mockImplementation(() => now);
    try {
      apiMocks.getExploreRadio.mockResolvedValue({
        items: Array.from({ length: 18 }, (_, idx) => makeTrack(`rot-${idx + 1}`, `Artist ${idx % 5}`)),
      });

      const { result } = renderHook(
        () =>
          useInfiniteDiscovery({
            localPool: [],
            mood: 'focus',
            genre: 'ambient',
            seed: 'rotation-stability',
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.deck.length).toBeGreaterThan(0));
      const initialStrategy = result.current.strategy;

      act(() => {
        result.current.saveTop();
      });
      expect(result.current.stats.saves).toBe(1);

      act(() => {
        now += 2_000;
        result.current.rotateStrategy();
      });

      await waitFor(() => {
        expect(result.current.strategy).not.toBe(initialStrategy);
      });
      expect(result.current.stats.saves).toBe(1);
      expect(result.current.deck.length).toBeGreaterThan(0);
    } finally {
      nowSpy.mockRestore();
    }
  });
});
