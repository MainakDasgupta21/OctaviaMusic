import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCharts, getChartsArtists } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { WINDOW_TTL_MS } from '@/types/charts.types';

const CHARTS_FETCH_LIMIT = 50;

export const useChartData = ({ mode, region, window }) => {
  const previousItemsRef = useRef([]);
  const [prevData, setPrevData] = useState([]);

  const staleTime = WINDOW_TTL_MS[window] || WINDOW_TTL_MS.this_week;

  const query = useQuery({
    queryKey:
      mode === 'artists'
        ? queryKeys.chartsArtists(region, window, CHARTS_FETCH_LIMIT)
        : queryKeys.charts(region, window, CHARTS_FETCH_LIMIT),
    queryFn: ({ signal }) =>
      (mode === 'artists' ? getChartsArtists : getCharts)({
        region,
        window,
        limit: CHARTS_FETCH_LIMIT,
        signal,
      }),
    staleTime,
    gcTime: staleTime * 2,
    refetchInterval: staleTime,
    refetchIntervalInBackground: true,
    retry: 4,
    retryDelay: (attemptIndex) => {
      const schedule = [5000, 15000, 30000, 60000];
      return schedule[attemptIndex] || 60000;
    },
  });

  useEffect(() => {
    const nextItems = Array.isArray(query.data?.items) ? query.data.items : null;
    if (!nextItems) return;
    setPrevData(previousItemsRef.current);
    previousItemsRef.current = nextItems;
  }, [query.dataUpdatedAt, query.data?.items]);

  const items = useMemo(() => {
    if (!Array.isArray(query.data?.items)) return [];
    return query.data.items;
  }, [query.data?.items]);

  const lastUpdatedRaw = query.data?.lastUpdated || query.data?.meta?.fetchedAt || null;
  const lastUpdated = lastUpdatedRaw ? new Date(lastUpdatedRaw) : null;

  return {
    data: items,
    prevData,
    isLoading: query.isPending && items.length === 0,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    lastUpdated,
    staleWarning: query.data?.meta?.warning || null,
    isStaleData: Boolean(query.data?.meta?.stale),
    source: query.data?.meta?.source || null,
    liveUpdatesEnabled: window === 'today',
  };
};

export default useChartData;
