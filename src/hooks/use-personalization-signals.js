// =============================================================================
// Derives lightweight personalization signals (artist play counts, recent
// search terms, top played artists) from the player history and the recent
// searches stored in localStorage. These feed into the ranker so frequently
// listened-to artists and queries the user typed yesterday float higher.
//
// The hook is intentionally a *read* surface — it never writes to history or
// recents itself. Memoized outputs keep the ranker's `useMemo` deps stable.
// =============================================================================

import { useEffect, useMemo, useState } from 'react';
import { usePlayer } from '@/contexts/PlayerContext';
import { normalize } from '@/lib/search-rank';

const RECENT_SEARCH_KEY = 'octavia.recent-searches.v1';
const HISTORY_WINDOW = 100;
const MAX_TOP_ARTISTS = 6;
const MAX_RECENT_TERMS = 12;

const readRecentSearchTerms = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_SEARCH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((s) => String(s ?? '').trim()).filter(Boolean).slice(0, MAX_RECENT_TERMS)
      : [];
  } catch {
    return [];
  }
};

// Walk the recent play history (most-recent first) and count plays per
// normalized artist name. We only consider the most recent `HISTORY_WINDOW`
// tracks so old listening habits don't dominate forever.
const buildArtistCounts = (history = []) => {
  const counts = new Map();
  const slice = Array.isArray(history) ? history.slice(0, HISTORY_WINDOW) : [];
  for (const track of slice) {
    const artistNorm = normalize(track?.artist || '');
    if (!artistNorm) continue;
    counts.set(artistNorm, (counts.get(artistNorm) || 0) + 1);
  }
  return counts;
};

const pickTopArtists = (counts) => {
  const entries = Array.from(counts.entries())
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_TOP_ARTISTS);
  return entries.map(([artist]) => artist);
};

export const usePersonalizationSignals = () => {
  const { history } = usePlayer();
  const [recentSearches, setRecentSearches] = useState(() => readRecentSearchTerms());

  // Re-read recents when localStorage changes from another tab; the
  // SearchPage / TopBar both write through this key so we react to their
  // updates synchronously by polling on focus too.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const sync = () => setRecentSearches(readRecentSearchTerms());
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
    };
  }, []);

  const historyArtistCounts = useMemo(() => buildArtistCounts(history), [history]);
  const topPlayedArtists = useMemo(() => pickTopArtists(historyArtistCounts), [historyArtistCounts]);
  const recentSearchTerms = useMemo(() => new Set(recentSearches), [recentSearches]);

  return {
    historyArtistCounts,
    topPlayedArtists,
    recentSearchTerms,
  };
};

export const __testing = {
  buildArtistCounts,
  pickTopArtists,
  readRecentSearchTerms,
  RECENT_SEARCH_KEY,
};

export default usePersonalizationSignals;
