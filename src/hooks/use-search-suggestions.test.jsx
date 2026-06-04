import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Hoisted mock so the inline factory can reference the spy without TDZ.
const { getSearchSuggestionsMock } = vi.hoisted(() => ({
  getSearchSuggestionsMock: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  getSearchSuggestions: getSearchSuggestionsMock,
}));

// Imported AFTER the mock so the hook picks up the spy version.
// eslint-disable-next-line import/first
import { useSearchSuggestions } from '@/hooks/use-search-suggestions';
// eslint-disable-next-line import/first
import { cachePolicy } from '@/lib/query-keys';

const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  const Wrapper = ({ children }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { Wrapper, client };
};

describe('useSearchSuggestions', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getSearchSuggestionsMock.mockReset();
    getSearchSuggestionsMock.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not fetch below the minimum query length', async () => {
    const { Wrapper } = makeWrapper();
    const { rerender } = renderHook(
      ({ q }) => useSearchSuggestions(q, { minLength: 2 }),
      { wrapper: Wrapper, initialProps: { q: '' } },
    );
    rerender({ q: 'a' });

    // Drain the debounce window even though we don't expect a call.
    await vi.advanceTimersByTimeAsync(300);
    expect(getSearchSuggestionsMock).not.toHaveBeenCalled();
  });

  it('fetches once after the debounce window elapses', async () => {
    getSearchSuggestionsMock.mockResolvedValueOnce([
      'michael jackson',
      'michael bolton',
    ]);

    const { Wrapper } = makeWrapper();
    // Mount with an empty query so the debounce starts cleanly, then simulate
    // the user typing by rerendering with the new query — this matches the
    // real-world flow (the input always starts empty).
    const { result, rerender } = renderHook(
      ({ q }) => useSearchSuggestions(q, { debounceMs: 150 }),
      { wrapper: Wrapper, initialProps: { q: '' } },
    );
    rerender({ q: 'mich' });

    // No call before the debounce elapses.
    expect(getSearchSuggestionsMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(160);
    await waitFor(() =>
      expect(getSearchSuggestionsMock).toHaveBeenCalledTimes(1),
    );
    expect(getSearchSuggestionsMock).toHaveBeenCalledWith('mich');

    await waitFor(() =>
      expect(result.current.suggestions).toEqual([
        'michael jackson',
        'michael bolton',
      ]),
    );
  });

  it('returns an empty array when the API resolves with no data', async () => {
    getSearchSuggestionsMock.mockResolvedValueOnce([]);

    const { Wrapper } = makeWrapper();
    const { result, rerender } = renderHook(
      ({ q }) => useSearchSuggestions(q),
      { wrapper: Wrapper, initialProps: { q: '' } },
    );
    rerender({ q: 'mich' });

    await vi.advanceTimersByTimeAsync(200);
    await waitFor(() =>
      expect(getSearchSuggestionsMock).toHaveBeenCalled(),
    );

    expect(Array.isArray(result.current.suggestions)).toBe(true);
    expect(result.current.suggestions).toHaveLength(0);
  });

  it('exposes the configured cachePolicy at the queryKeys level', () => {
    // Sanity check that the cache policy is present and tuned for the
    // suggestions endpoint (long stale, long gc — they're cheap and stable).
    expect(cachePolicy.searchSuggestions).toBeTruthy();
    expect(cachePolicy.searchSuggestions.staleTime).toBeGreaterThanOrEqual(60_000);
    expect(cachePolicy.searchSuggestions.gcTime).toBeGreaterThanOrEqual(
      cachePolicy.searchSuggestions.staleTime,
    );
  });
});
