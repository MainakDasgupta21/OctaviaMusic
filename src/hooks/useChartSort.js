import { useEffect, useMemo, useState } from 'react';
import { parseDurationToSeconds } from '@/lib/chartsUtils';

const DEFAULT_SORT = { column: 'rank', direction: 'asc' };

const compareNumbers = (a, b) => (a || 0) - (b || 0);
const compareStrings = (a, b) => String(a || '').localeCompare(String(b || ''));

const getSongSortValue = (entry, column) => {
  if (column === 'streams') return entry.streams || 0;
  if (column === 'weeksOnChart') return entry.weeksOnChart || 0;
  if (column === 'duration') return parseDurationToSeconds(entry.duration);
  return entry.rank || 0;
};

const getArtistSortValue = (entry, column) => {
  if (column === 'monthlyStreams') return entry.monthlyStreamsValue || 0;
  if (column === 'tracksOnChart') return entry.tracksOnChart || 0;
  if (column === 'name') return entry.name || '';
  return entry.rank || 0;
};

export const useChartSort = ({ mode, data }) => {
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [debouncedSort, setDebouncedSort] = useState(DEFAULT_SORT);

  useEffect(() => {
    setSort(DEFAULT_SORT);
    setDebouncedSort(DEFAULT_SORT);
  }, [mode]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSort(sort), 100);
    return () => clearTimeout(timer);
  }, [sort]);

  const sortedData = useMemo(() => {
    const entries = [...data];
    const { column, direction } = debouncedSort;
    const sign = direction === 'asc' ? 1 : -1;
    const getter = mode === 'songs' ? getSongSortValue : getArtistSortValue;

    if (column === 'rank') {
      return entries.sort((a, b) => compareNumbers(a.rank, b.rank));
    }

    return entries.sort((a, b) => {
      const left = getter(a, column);
      const right = getter(b, column);
      const diff =
        typeof left === 'string' || typeof right === 'string'
          ? compareStrings(left, right)
          : compareNumbers(left, right);
      if (diff === 0) return compareNumbers(a.rank, b.rank);
      return diff * sign;
    });
  }, [data, debouncedSort, mode]);

  const toggleSort = (column) => {
    if (column === 'rank') {
      setSort(DEFAULT_SORT);
      return;
    }
    setSort((current) => {
      if (current.column !== column) {
        return {
          column,
          direction: 'desc',
        };
      }
      return {
        column,
        direction: current.direction === 'desc' ? 'asc' : 'desc',
      };
    });
  };

  return {
    sortedData,
    sortColumn: sort.column,
    sortDirection: sort.direction,
    toggleSort,
  };
};

export default useChartSort;
