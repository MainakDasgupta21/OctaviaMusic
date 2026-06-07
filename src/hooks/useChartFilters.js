import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  buildChartsSearch,
  normalizeMode,
  normalizeRegion,
  normalizeWindow,
} from '@/lib/chartsUtils';

const DEFAULT_FILTERS = {
  mode: 'artists',
  region: 'global',
  window: 'this_week',
};

export const useChartFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const rawMode = searchParams.get('mode');
    const rawRegion = searchParams.get('region');
    const rawWindow = searchParams.get('window');
    return {
      mode: normalizeMode(rawMode || DEFAULT_FILTERS.mode),
      region: normalizeRegion(rawRegion || DEFAULT_FILTERS.region),
      window: normalizeWindow(rawWindow || DEFAULT_FILTERS.window),
    };
  }, [searchParams]);

  const updateFilters = useCallback(
    (patch) => {
      setSearchParams((prev) => {
        const current = {
          mode: normalizeMode(prev.get('mode') || DEFAULT_FILTERS.mode),
          region: normalizeRegion(prev.get('region') || DEFAULT_FILTERS.region),
          window: normalizeWindow(prev.get('window') || DEFAULT_FILTERS.window),
        };
        const next = {
          ...current,
          ...patch,
        };
        return new URLSearchParams(buildChartsSearch(next));
      });
    },
    [setSearchParams],
  );

  return {
    ...filters,
    setMode: (mode) => updateFilters({ mode }),
    setRegion: (region) => updateFilters({ region }),
    setWindow: (window) => updateFilters({ window }),
    setFilters: updateFilters,
  };
};

export default useChartFilters;
