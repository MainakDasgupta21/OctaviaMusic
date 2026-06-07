import { useCallback, useEffect, useRef, useState } from 'react';
import { EMPTY_FILTERS, hasAnyFilter } from '@/lib/search-filter-state';

// =============================================================================
// Remember the user's last few filter snapshots so the Add-filter palette
// can offer a one-tap "Recent" row. Persistence is opt-in / forgiving:
// any storage error (SSR, private mode, quota) silently degrades to an
// in-memory list for the session.
// =============================================================================

export const RECENT_KEY = 'octavia.search.recent-filter-combos';
export const RECENT_CAP = 3;
export const RECENT_DEBOUNCE_MS = 1500;

// Canonical-shape key so two semantically-equal filter objects share an id
// regardless of property insertion order.
export const serializeFiltersKey = (filters) => {
  const f = { ...EMPTY_FILTERS, ...(filters || {}) };
  return JSON.stringify({
    sort: f.sort || 'relevance',
    yearFrom: Number.isFinite(f.yearFrom) ? f.yearFrom : null,
    yearTo: Number.isFinite(f.yearTo) ? f.yearTo : null,
    durationMax: Number.isFinite(f.durationMax) ? f.durationMax : null,
    artist: f.artist || '',
    album: f.album || '',
    clean: Boolean(f.clean),
    mood: Array.isArray(f.mood) ? [...f.mood].sort() : [],
    exclude: Array.isArray(f.exclude) ? [...f.exclude].sort() : [],
  });
};

const readSafe = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (c) =>
          c &&
          typeof c.key === 'string' &&
          c.filters &&
          typeof c.filters === 'object',
      )
      .slice(0, RECENT_CAP);
  } catch {
    return [];
  }
};

const writeSafe = (next) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Quota / private mode — fall back silently.
  }
};

export const useRecentFilterCombos = (filters) => {
  const [combos, setCombos] = useState(() => readSafe());
  const timerRef = useRef(null);

  useEffect(() => {
    if (!hasAnyFilter(filters)) return undefined;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCombos((prev) => {
        const key = serializeFiltersKey(filters);
        const without = prev.filter((c) => c.key !== key);
        const next = [
          { key, filters: { ...EMPTY_FILTERS, ...filters }, ts: Date.now() },
          ...without,
        ].slice(0, RECENT_CAP);
        writeSafe(next);
        return next;
      });
    }, RECENT_DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [filters]);

  const clear = useCallback(() => {
    writeSafe([]);
    setCombos([]);
  }, []);

  return [combos, clear];
};

export default useRecentFilterCombos;
