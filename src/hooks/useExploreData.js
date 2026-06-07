import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCharts, getGenres, getTrending } from '@/lib/api';
import { cachePolicy, queryKeys } from '@/lib/query-keys';
import {
  buildBecauseList,
  buildCandidatePool,
  buildDailyMixes,
  buildHiddenGems,
  isColdStartUser,
} from '@/lib/explore-recommendations';

const TRENDING_LIMIT = 40;
const CHARTS_LIMIT = 40;
const CHARTS_ENABLE_DELAY_MS = 350;

export const useExploreData = ({
  history = [],
  favorites = [],
  followedArtists = [],
  tasteSeed = null,
  tasteProfile = null,
} = {}) => {
  const queryClient = useQueryClient();
  const [chartsEnabled, setChartsEnabled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setChartsEnabled(true), CHARTS_ENABLE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const freshKey = queryKeys.charts('global', 'this_month', CHARTS_LIMIT);
  const classicKey = queryKeys.charts('global', 'all_time', CHARTS_LIMIT);
  const hasWarmFresh = Boolean(queryClient.getQueryData(freshKey));
  const hasWarmClassic = Boolean(queryClient.getQueryData(classicKey));

  const {
    data: genres = [],
    isLoading: genresLoading,
    isError: genresError,
    refetch: refetchGenres,
  } = useQuery({
    queryKey: queryKeys.genres(),
    queryFn: ({ signal }) => getGenres({ signal }),
    ...cachePolicy.genres,
  });

  const {
    data: trending = [],
    isLoading: trendingLoading,
    isError: trendingError,
  } = useQuery({
    queryKey: queryKeys.trending(TRENDING_LIMIT),
    queryFn: ({ signal }) => getTrending({ limit: TRENDING_LIMIT, signal }),
    ...cachePolicy.trending,
  });

  const {
    data: chartsFreshPayload,
    isLoading: chartsFreshLoading,
    isError: chartsFreshError,
  } = useQuery({
    queryKey: freshKey,
    queryFn: ({ signal }) =>
      getCharts({
        region: 'global',
        window: 'this_month',
        limit: CHARTS_LIMIT,
        signal,
      }),
    enabled: chartsEnabled || hasWarmFresh,
    ...cachePolicy.charts,
  });

  const {
    data: chartsClassicPayload,
    isLoading: chartsClassicLoading,
    isError: chartsClassicError,
  } = useQuery({
    queryKey: classicKey,
    queryFn: ({ signal }) =>
      getCharts({
        region: 'global',
        window: 'all_time',
        limit: CHARTS_LIMIT,
        signal,
      }),
    enabled: chartsEnabled || hasWarmClassic,
    ...cachePolicy.charts,
  });

  const chartsFresh = chartsFreshPayload?.items || [];
  const chartsClassic = chartsClassicPayload?.items || [];

  const candidatePool = useMemo(
    () =>
      buildCandidatePool({
        trending,
        chartsFresh,
        chartsClassic,
        history,
        favorites,
      }),
    [trending, chartsFresh, chartsClassic, history, favorites],
  );

  const isColdStart = useMemo(
    () => isColdStartUser({ history, favorites }),
    [history, favorites],
  );

  const dailyMixes = useMemo(
    () =>
      buildDailyMixes({
        history,
        favorites,
        followedArtists,
        genres,
        pool: candidatePool,
        tasteSeed,
        tasteProfile,
      }),
    [history, favorites, followedArtists, genres, candidatePool, tasteSeed, tasteProfile],
  );

  const lastLiked = favorites[0] || null;
  const becauseList = useMemo(
    () =>
      buildBecauseList({
        lastLiked,
        pool: candidatePool,
        history,
        favorites,
        followedArtists,
        tasteProfile,
        max: 4,
      }),
    [lastLiked, candidatePool, history, favorites, followedArtists, tasteProfile],
  );

  const hiddenGems = useMemo(
    () =>
      buildHiddenGems({
        pool: candidatePool,
        history,
        favorites,
        followedArtists,
        tasteProfile,
        count: 12,
      }),
    [candidatePool, history, favorites, followedArtists, tasteProfile],
  );

  return {
    genres,
    genresLoading,
    genresError,
    refetchGenres,
    trending,
    trendingLoading,
    trendingError,
    chartsFresh,
    chartsFreshPayload,
    chartsFreshLoading,
    chartsFreshError,
    chartsClassic,
    chartsClassicPayload,
    chartsClassicLoading,
    chartsClassicError,
    candidatePool,
    isColdStart,
    dailyMixes,
    lastLiked,
    becauseList,
    hiddenGems,
    recommendationLoading: trendingLoading || chartsFreshLoading || chartsClassicLoading,
    recommendationError: trendingError || chartsFreshError || chartsClassicError,
    lastUpdatedAt:
      chartsFreshPayload?.meta?.updatedAt
      || chartsClassicPayload?.meta?.updatedAt
      || null,
  };
};

export default useExploreData;
