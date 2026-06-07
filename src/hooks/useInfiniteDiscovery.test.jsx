import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useInfiniteDiscovery from '@/hooks/useInfiniteDiscovery';

const apiMocks = vi.hoisted(() => ({
  getExploreRadio: vi.fn(),
  getExploreSimilar: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  getExploreRadio: (...args) => apiMocks.getExploreRadio(...args),
  getExploreSimilar: (...args) => apiMocks.getExploreSimilar(...args),
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
});
