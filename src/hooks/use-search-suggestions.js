import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getSearchSuggestions } from '@/lib/api';
import { cachePolicy, queryKeys } from '@/lib/query-keys';

const useDebouncedValue = (value, delay) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

// =============================================================================
// useSearchSuggestions
//
// Calls `/api/search/suggestions?q=…` (a thin wrapper over YTM's real
// autocomplete) with a debounce + 2-char minimum so we don't hammer the
// upstream while the user types the first letter or two.
//
// The hook never throws — failures resolve to an empty array — so callers
// can safely render `suggestions` without try/catch wrappers.
// =============================================================================
export const useSearchSuggestions = (
  query,
  { enabled = true, debounceMs = 150, minLength = 2 } = {},
) => {
  const raw = String(query ?? '').trim();
  const debounced = useDebouncedValue(raw, debounceMs);
  const shouldFetch = Boolean(enabled && debounced && debounced.length >= minLength);

  const { data, isFetching, isLoading } = useQuery({
    queryKey: queryKeys.searchSuggestions(debounced),
    queryFn: () => getSearchSuggestions(debounced),
    enabled: shouldFetch,
    ...cachePolicy.searchSuggestions,
    placeholderData: keepPreviousData,
  });

  return {
    suggestions: Array.isArray(data) ? data : [],
    isFetching,
    isLoading,
  };
};

export default useSearchSuggestions;
