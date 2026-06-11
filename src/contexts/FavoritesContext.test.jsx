import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FavoritesProvider, useFavorites } from '@/contexts/FavoritesContext';

const STORAGE_KEY = 'octavia.favorites.v1';

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

describe('FavoritesContext merge on login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateRef.current = { user: null };
    window.localStorage.clear();
    apiGet.mockResolvedValue({ data: { items: [] } });
    apiPost.mockResolvedValue({ data: {} });
    apiDelete.mockResolvedValue({ data: {} });
  });

  it('merges guest favorites into server once user signs in', async () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      'track-1': {
        id: 'track-1',
        videoId: 'dQw4w9WgXcQ',
        title: 'Never Gonna Give You Up',
        artist: 'Rick Astley',
        addedAt: Date.now(),
      },
    }));

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    const { rerender } = renderHook(() => useFavorites(), {
      wrapper: createWrapper(queryClient),
    });

    expect(apiGet).not.toHaveBeenCalled();

    authStateRef.current = { user: { id: 'u-1', role: 'user' } };
    rerender();

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/me/favorites'));
    await waitFor(() => expect(apiPost).toHaveBeenCalled());
    await waitFor(() => expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull());
  });
});
