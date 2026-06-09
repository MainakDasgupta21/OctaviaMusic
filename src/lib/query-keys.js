// =============================================================================
// Centralized React Query key factory.
// Importing these everywhere prevents key drift and unlocks shared cache hits
// across pages (e.g. Home and Trending serving from the same trending entry).
// =============================================================================

const normalizeQuery = (q) => String(q ?? '').trim().toLowerCase();
const normalizeType = (type) => String(type ?? 'all').trim().toLowerCase();
const normalizeToken = (value) => String(value ?? '').trim().toLowerCase();
const normalizeLimit = (limit) => {
  if (!Number.isFinite(limit) || limit <= 0) return null;
  return Math.round(limit);
};
const CHART_WINDOW_ALIASES = {
  daily: 'today',
  weekly: 'this_week',
  monthly: 'this_month',
  alltime: 'all_time',
};
const CHART_WINDOWS = new Set(['today', 'this_week', 'this_month', 'all_time']);
const CHART_REGION_ALIASES = {
  in: 'india',
  jp: 'japan',
  gb: 'uk',
};
const CHART_REGIONS = new Set(['global', 'us', 'uk', 'japan', 'india']);
const normalizeChartWindow = (window = 'this_week') => {
  const raw = String(window ?? '').trim().toLowerCase();
  const normalized = CHART_WINDOW_ALIASES[raw] || raw;
  return CHART_WINDOWS.has(normalized) ? normalized : 'this_week';
};
const normalizeChartRegion = (region = 'global') => {
  const raw = String(region ?? '').trim().toLowerCase();
  const normalized = CHART_REGION_ALIASES[raw] || raw;
  return CHART_REGIONS.has(normalized) ? normalized : 'global';
};

export const queryKeys = {
  homeFeed: (limit = 20) => ['home', { limit }],
  homeFeatured: () => ['home', 'featured'],
  trending: (limit = 20) => ['trending', { limit }],
  charts: (region = 'global', window = 'this_week', limit = 50) => [
    'charts',
    {
      region: normalizeChartRegion(region),
      window: normalizeChartWindow(window),
      limit: normalizeLimit(limit) ?? 50,
    },
  ],
  chartsArtists: (region = 'global', window = 'this_week', limit = 50) => [
    'charts',
    'artists',
    {
      region: normalizeChartRegion(region),
      window: normalizeChartWindow(window),
      limit: normalizeLimit(limit) ?? 50,
    },
  ],
  genres: () => ['genres'],
  // `limit` is part of the key so a 30-row TopBar request and a 60-row
  // SearchPage request stay separate cache entries (the response sizes
  // differ). Default of `null` preserves the existing key shape for callers
  // that don't pass a limit.
  search: (q, type = 'all', limit = null) => [
    'search',
    {
      q: normalizeQuery(q),
      type: normalizeType(type),
      limit: normalizeLimit(limit),
    },
  ],
  searchSuggestions: (q) => [
    'search',
    'suggestions',
    { q: normalizeQuery(q) },
  ],
  album: (id) => ['album', id],
  artist: (slug) => ['artist', slug],
  explorePulse: (region = 'global') => ['explore', 'pulse', { region: normalizeChartRegion(region) }],
  exploreRadio: ({
    mood = '',
    genre = '',
    seed = '',
    limit = 24,
  } = {}) => [
    'explore',
    'radio',
    {
      mood: normalizeToken(mood),
      genre: normalizeToken(genre),
      seed: normalizeToken(seed),
      limit: normalizeLimit(limit) ?? 24,
    },
  ],
  exploreSimilar: ({ trackId = '', limit = 12 } = {}) => [
    'explore',
    'similar',
    {
      trackId: normalizeToken(trackId),
      limit: normalizeLimit(limit) ?? 12,
    },
  ],
  exploreJourney: (journeyId) => ['explore', 'journey', normalizeToken(journeyId)],
  lyrics: (title, artist, durationSec, videoId = '') => [
    'lyrics',
    {
      title: String(title ?? '').trim(),
      artist: String(artist ?? '').trim(),
      durationSec: Number.isFinite(durationSec) ? Math.round(durationSec) : null,
      videoId: String(videoId ?? '').trim(),
    },
  ],
};

// =============================================================================
// Per-resource cache defaults.
// React Query v5: `gcTime` replaced `cacheTime`. We tier these so frequently
// changing data (search) stays fresh, while editorial/long-lived data
// (charts, trending, genres) gets long stale windows for instant revisits.
// =============================================================================
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const cachePolicy = {
  homeFeed:           { staleTime: HOUR,       gcTime: 6 * HOUR },
  trending:           { staleTime: HOUR,       gcTime: 6 * HOUR },
  charts:             { staleTime: HOUR,       gcTime: 6 * HOUR },
  chartsArtists:      { staleTime: HOUR,       gcTime: 6 * HOUR },
  genres:             { staleTime: HOUR,       gcTime: 12 * HOUR },
  search:             { staleTime: 60_000,     gcTime: 30 * MIN },
  // Suggestions are far less volatile than search results and small
  // (string[]). Cache them for 5 min so consecutive keystrokes typed within
  // the same query share one network round-trip.
  searchSuggestions:  { staleTime: 5 * MIN,    gcTime: 30 * MIN },
  album:              { staleTime: 30 * MIN,   gcTime: 6 * HOUR },
  artist:             { staleTime: 30 * MIN,   gcTime: 6 * HOUR },
  explorePulse:       { staleTime: 2 * MIN,    gcTime: 30 * MIN },
  exploreRadio:       { staleTime: 60_000,     gcTime: 15 * MIN },
  exploreSimilar:     { staleTime: 2 * MIN,    gcTime: 30 * MIN },
  exploreJourney:     { staleTime: 5 * MIN,    gcTime: 30 * MIN },
  lyrics:             { staleTime: 6 * HOUR,   gcTime: DAY },
};

export default queryKeys;
