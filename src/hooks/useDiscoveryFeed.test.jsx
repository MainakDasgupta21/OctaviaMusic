import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useDiscoveryFeed from '@/hooks/useDiscoveryFeed';

const discoveryMocks = vi.hoisted(() => ({
  subscriber: null,
  getRecentStrategies: vi.fn(() => []),
  markStrategyUsed: vi.fn(),
}));

const strategyMocks = vi.hoisted(() => ({
  pickStrategies: vi.fn(() => [
    { id: 'strategy-alpha', label: 'Alpha' },
    { id: 'strategy-beta', label: 'Beta' },
  ]),
}));

vi.mock('@/lib/discovery-memory', () => ({
  __esModule: true,
  getSeenTrackSet: () => new Set(),
  getArtistFatigueMap: () => new Map(),
  getRecentStrategies: (...args) => discoveryMocks.getRecentStrategies(...args),
  markStrategyUsed: (...args) => discoveryMocks.markStrategyUsed(...args),
  subscribeDiscoveryMemory: (callback) => {
    discoveryMocks.subscriber = callback;
    return () => {
      discoveryMocks.subscriber = null;
    };
  },
}));

vi.mock('@/lib/discovery-strategies', () => ({
  __esModule: true,
  pickStrategies: (...args) => strategyMocks.pickStrategies(...args),
  buildStrategyRequests: ({ strategies = [] }) =>
    strategies.map((strategy) => ({
      id: strategy.id,
      label: strategy.label || strategy.id,
      strategyId: strategy.id,
      queryKey: [strategy.id],
      queryFn: async () => ({
        items: [
          {
            id: `${strategy.id}-track`,
            videoId: `${strategy.id}-track`,
            title: `${strategy.id} Track`,
            artist: `${strategy.id} Artist`,
          },
        ],
      }),
    })),
}));

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

describe('useDiscoveryFeed', () => {
  beforeEach(() => {
    discoveryMocks.subscriber = null;
    discoveryMocks.getRecentStrategies.mockReset();
    discoveryMocks.getRecentStrategies.mockReturnValue([]);
    discoveryMocks.markStrategyUsed.mockReset();
    strategyMocks.pickStrategies.mockReset();
    strategyMocks.pickStrategies.mockReturnValue([
      { id: 'strategy-alpha', label: 'Alpha' },
      { id: 'strategy-beta', label: 'Beta' },
    ]);
  });

  it('locks selected strategies for a session and only reselection on refresh', async () => {
    const { result } = renderHook(
      () =>
        useDiscoveryFeed({
          mood: 'focus',
          genre: 'ambient',
          enabled: true,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.byStrategy.length).toBeGreaterThan(0);
    });
    expect(strategyMocks.pickStrategies).toHaveBeenCalledTimes(1);

    act(() => {
      discoveryMocks.subscriber?.();
    });
    await waitFor(() => {
      expect(result.current.byStrategy.length).toBeGreaterThan(0);
    });
    expect(strategyMocks.pickStrategies).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refresh();
    });
    await waitFor(() => {
      expect(strategyMocks.pickStrategies).toHaveBeenCalledTimes(2);
    });
  });
});
