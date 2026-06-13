import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FavoritesProvider, useFavorites } from '@/contexts/FavoritesContext';

const { apiGet, apiPost, apiDelete, authStateRef } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
  authStateRef: { current: { user: null } },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authStateRef.current,
}));

vi.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    get: apiGet,
    post: apiPost,
    delete: apiDelete,
  },
}));

const createWrapper = (queryClient) =>
  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <FavoritesProvider>{children}</FavoritesProvider>
      </QueryClientProvider>
    );
  };

describe('FavoritesContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateRef.current = { user: null };
    apiGet.mockResolvedValue({ data: { items: [] } });
    apiPost.mockResolvedValue({ data: {} });
    apiDelete.mockResolvedValue({ data: {} });
  });

  it('requires login before mutating favorites', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const { result } = renderHook(() => useFavorites(), {
      wrapper: createWrapper(queryClient),
    });

    const added = result.current.toggleFavorite({
      id: 'track-1',
      videoId: 'dQw4w9WgXcQ',
      title: 'Never Gonna Give You Up',
      artist: 'Rick Astley',
    });
    expect(added).toBeNull();
    expect(result.current.count).toBe(0);
    expect(apiGet).not.toHaveBeenCalled();
    expect(apiPost).not.toHaveBeenCalled();
    expect(apiDelete).not.toHaveBeenCalled();
  });

  it('loads server favorites and syncs toggle calls when signed in', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    authStateRef.current = { user: { id: 'u-1', role: 'user' } };

    const { result } = renderHook(() => useFavorites(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/me/favorites'));
    const payload = {
      id: 'track-1',
      videoId: 'dQw4w9WgXcQ',
      title: 'Never Gonna Give You Up',
      artist: 'Rick Astley',
    };

    const added = result.current.toggleFavorite(payload);
    expect(added).toBe(true);
    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/me/favorites', { track: expect.any(Object) }));

    const removed = result.current.toggleFavorite(payload);
    expect(removed).toBe(false);
    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith('/me/favorites/track-1'));
  });

  it('saves and lists songs that lack a playable video id', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    authStateRef.current = { user: { id: 'u-1', role: 'user' } };
    apiGet.mockResolvedValue({
      data: {
        items: [
          { id: 'non-standard-id', title: 'Rare Live Set', artist: 'Some Artist' },
        ],
      },
    });

    const { result } = renderHook(() => useFavorites(), {
      wrapper: createWrapper(queryClient),
    });

    // A stored favorite without a valid 11-char video id is still listed.
    await waitFor(() => expect(result.current.count).toBe(1));
    expect(result.current.list[0].id).toBe('non-standard-id');

    // Liking such a track is saved rather than silently refused.
    const added = result.current.toggleFavorite({
      id: 'another-rare-id',
      title: 'Unreleased Mix',
      artist: 'Some Artist',
    });
    expect(added).toBe(true);
    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith('/me/favorites', { track: expect.any(Object) }),
    );
  });
});
