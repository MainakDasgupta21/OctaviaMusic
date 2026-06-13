// =============================================================================
// Derives lightweight personalization signals (artist play counts, recent
// search terms, top played artists) from the player history and the user's
// search history. These feed into the ranker so frequently listened-to artists
// and queries the user typed yesterday float higher.
//
// Recent search terms come from `useSearchHistory`, which is database-backed
// for signed-in users and a local fallback for guests — so the same signal is
// used everywhere instead of reading localStorage directly.
//
// The hook is intentionally a *read* surface — it never writes to history or
// recents itself. Memoized outputs keep the ranker's `useMemo` deps stable.
// =============================================================================

import { useMemo } from 'react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useSearchHistory } from '@/contexts/SearchHistoryContext';
import { normalize } from '@/lib/search-rank';

const HISTORY_WINDOW = 100;
const MAX_TOP_ARTISTS = 6;
const MAX_RECENT_TERMS = 12;

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

const normalizeRecentTerms = (searches) =>
  (Array.isArray(searches) ? searches : [])
    .map((term) => String(term ?? '').trim())
    .filter(Boolean)
    .slice(0, MAX_RECENT_TERMS);

export const usePersonalizationSignals = () => {
  const { history } = usePlayer();
  const { searches } = useSearchHistory();

  const historyArtistCounts = useMemo(() => buildArtistCounts(history), [history]);
  const topPlayedArtists = useMemo(() => pickTopArtists(historyArtistCounts), [historyArtistCounts]);
  const recentSearchTerms = useMemo(
    () => new Set(normalizeRecentTerms(searches)),
    [searches],
  );

  return {
    historyArtistCounts,
    topPlayedArtists,
    recentSearchTerms,
  };
};

export const __testing = {
  buildArtistCounts,
  pickTopArtists,
  normalizeRecentTerms,
};

export default usePersonalizationSignals;
