import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

// Search history is per-user and database-backed when signed in. Guests fall
// back to a small localStorage cache so the search box still surfaces recent
// terms; that cache is cleared on login/logout (see AuthContext) so it never
// leaks across accounts. The public surface is a plain `string[]` of queries
// (most-recent first) to match how the search UI already consumed recents.
const GUEST_SEARCH_KEY = 'octavia.recent-searches.v1';
const GUEST_CAP = 8;
const SERVER_LIMIT = 50;

export const searchHistoryQueryKey = (userId) => ['me', 'searches', userId];

const normalizeTerm = (term) => String(term ?? '').trim();

const dedupePrepend = (list, term, cap) => {
  const lower = term.toLowerCase();
  return [term, ...list.filter((entry) => entry.toLowerCase() !== lower)].slice(0, cap);
};

const readGuestSearches = () => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(GUEST_SEARCH_KEY) || '[]');
    return Array.isArray(parsed)
      ? parsed.map((entry) => normalizeTerm(entry)).filter(Boolean).slice(0, GUEST_CAP)
      : [];
  } catch {
    return [];
  }
};

const writeGuestSearches = (list) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GUEST_SEARCH_KEY, JSON.stringify(list.slice(0, GUEST_CAP)));
  } catch {
    /* storage unavailable */
  }
};

const mapServerSearches = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map((item) => normalizeTerm(item?.query)).filter(Boolean);
};

// A no-op default keeps read-only consumers (e.g. personalization signals,
// command palette) safe even when rendered outside the provider in tests.
const NOOP = () => {};
const DEFAULT_VALUE = {
  searches: [],
  recordSearch: NOOP,
  removeSearch: NOOP,
  clearSearches: NOOP,
};

// Stable empty reference for the authenticated loading state (avoids `[]`).
const EMPTY_SEARCHES = Object.freeze([]);

const SearchHistoryContext = createContext(DEFAULT_VALUE);

export const SearchHistoryProvider = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || user?._id || null;
  const queryClient = useQueryClient();
  const queryKey = searchHistoryQueryKey(userId);

  const [guestSearches, setGuestSearches] = useState(() => readGuestSearches());

  const searchesQuery = useQuery({
    queryKey,
    enabled: Boolean(userId),
    queryFn: async () => {
      const response = await api.get('/me/searches', { params: { limit: SERVER_LIMIT } });
      return mapServerSearches(response.data?.items || []);
    },
    staleTime: 30000,
  });

  const recordMutation = useMutation({
    mutationFn: async (query) => {
      await api.post('/me/searches', { query });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (query) => {
      await api.delete('/me/searches', { params: { query } });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/me/searches');
    },
  });

  const searches = userId ? searchesQuery.data || EMPTY_SEARCHES : guestSearches;

  const recordSearch = useCallback(
    (term) => {
      const query = normalizeTerm(term);
      if (!query) return;

      if (!userId) {
        setGuestSearches((prev) => {
          const next = dedupePrepend(prev, query, GUEST_CAP);
          writeGuestSearches(next);
          return next;
        });
        return;
      }

      const prev = queryClient.getQueryData(queryKey) || [];
      const next = dedupePrepend(prev, query, SERVER_LIMIT);
      queryClient.setQueryData(queryKey, next);
      recordMutation.mutate(query, {
        onError: () => queryClient.setQueryData(queryKey, prev),
      });
    },
    [queryClient, queryKey, recordMutation, userId],
  );

  const removeSearch = useCallback(
    (term) => {
      const query = normalizeTerm(term);
      if (!query) return;

      if (!userId) {
        setGuestSearches((prev) => {
          const next = prev.filter((entry) => entry !== query);
          writeGuestSearches(next);
          return next;
        });
        return;
      }

      const prev = queryClient.getQueryData(queryKey) || [];
      const next = prev.filter((entry) => entry.toLowerCase() !== query.toLowerCase());
      queryClient.setQueryData(queryKey, next);
      removeMutation.mutate(query, {
        onError: () => queryClient.setQueryData(queryKey, prev),
      });
    },
    [queryClient, queryKey, removeMutation, userId],
  );

  const clearSearches = useCallback(() => {
    if (!userId) {
      setGuestSearches([]);
      writeGuestSearches([]);
      return;
    }

    const prev = queryClient.getQueryData(queryKey) || [];
    queryClient.setQueryData(queryKey, []);
    clearMutation.mutate(undefined, {
      onError: () => queryClient.setQueryData(queryKey, prev),
    });
  }, [clearMutation, queryClient, queryKey, userId]);

  const value = useMemo(
    () => ({ searches, recordSearch, removeSearch, clearSearches }),
    [searches, recordSearch, removeSearch, clearSearches],
  );

  return (
    <SearchHistoryContext.Provider value={value}>{children}</SearchHistoryContext.Provider>
  );
};

export const useSearchHistory = () => useContext(SearchHistoryContext);

export const __testing = {
  GUEST_SEARCH_KEY,
  GUEST_CAP,
  SERVER_LIMIT,
  dedupePrepend,
  mapServerSearches,
  readGuestSearches,
};

export default SearchHistoryContext;
