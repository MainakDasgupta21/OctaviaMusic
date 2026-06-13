import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  SearchHistoryProvider,
  useSearchHistory,
  __testing,
} from '@/contexts/SearchHistoryContext';

const { GUEST_SEARCH_KEY } = __testing;

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
        <SearchHistoryProvider>{children}</SearchHistoryProvider>
      </QueryClientProvider>
    );
  };

const makeClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

describe('SearchHistoryContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateRef.current = { user: null };
    window.localStorage.clear();
    apiGet.mockResolvedValue({ data: { items: [] } });
    apiPost.mockResolvedValue({ data: {} });
    apiDelete.mockResolvedValue({ data: {} });
  });

  it('keeps guest searches in localStorage without hitting the API', () => {
    const { result } = renderHook(() => useSearchHistory(), {
      wrapper: createWrapper(makeClient()),
    });

    act(() => result.current.recordSearch('Blinding Lights'));
    act(() => result.current.recordSearch('Starboy'));
    // Duplicate (case-insensitive) bumps to front without duplicating.
    act(() => result.current.recordSearch('blinding lights'));

    expect(result.current.searches).toEqual(['blinding lights', 'Starboy']);
    expect(JSON.parse(window.localStorage.getItem(GUEST_SEARCH_KEY))).toEqual([
      'blinding lights',
      'Starboy',
    ]);
    expect(apiGet).not.toHaveBeenCalled();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('loads, records, removes, and clears server searches when signed in', async () => {
    authStateRef.current = { user: { id: 'u-1', role: 'user' } };
    apiGet.mockResolvedValue({
      data: { items: [{ query: 'starboy' }, { query: 'blinding lights' }] },
    });

    const { result } = renderHook(() => useSearchHistory(), {
      wrapper: createWrapper(makeClient()),
    });

    await waitFor(() =>
      expect(apiGet).toHaveBeenCalledWith('/me/searches', { params: { limit: 50 } }),
    );
    await waitFor(() => expect(result.current.searches).toEqual(['starboy', 'blinding lights']));

    act(() => result.current.recordSearch('Take On Me'));
    await waitFor(() => expect(result.current.searches[0]).toBe('Take On Me'));
    await waitFor(() =>
      expect(apiPost).toHaveBeenCalledWith('/me/searches', { query: 'Take On Me' }),
    );

    act(() => result.current.removeSearch('starboy'));
    await waitFor(() => expect(result.current.searches).not.toContain('starboy'));
    await waitFor(() =>
      expect(apiDelete).toHaveBeenCalledWith('/me/searches', { params: { query: 'starboy' } }),
    );

    act(() => result.current.clearSearches());
    await waitFor(() => expect(result.current.searches).toEqual([]));
    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith('/me/searches'));
  });
});
