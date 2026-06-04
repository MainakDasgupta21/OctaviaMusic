// =============================================================================
// Centralized React Query key factory.
// Importing these everywhere prevents key drift and unlocks shared cache hits
// across pages (e.g. Home and Trending serving from the same trending entry).
// =============================================================================

const normalizeQuery = (q) => String(q ?? '').trim().toLowerCase();
const normalizeType = (type) => String(type ?? 'all').trim().toLowerCase();

export const queryKeys = {
  homeFeed: (limit = 20) => ['home', { limit }],
  homeFeatured: () => ['home', 'featured'],
  trending: (limit = 20) => ['trending', { limit }],
  charts: (region = 'global', window = 'weekly', limit = 50) => [
    'charts',
    { region, window, limit },
  ],
  genres: () => ['genres'],
  search: (q, type = 'all') => [
    'search',
    { q: normalizeQuery(q), type: normalizeType(type) },
  ],
  album: (id) => ['album', id],
  artist: (slug) => ['artist', slug],
  lyrics: (title, artist, durationSec) => [
    'lyrics',
    {
      title: String(title ?? '').trim(),
      artist: String(artist ?? '').trim(),
      durationSec: Number.isFinite(durationSec) ? Math.round(durationSec) : null,
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
  homeFeed:   { staleTime: HOUR,       gcTime: 6 * HOUR },
  trending:   { staleTime: HOUR,       gcTime: 6 * HOUR },
  charts:     { staleTime: HOUR,       gcTime: 6 * HOUR },
  genres:     { staleTime: HOUR,       gcTime: 12 * HOUR },
  search:     { staleTime: 60_000,     gcTime: 30 * MIN },
  album:      { staleTime: 30 * MIN,   gcTime: 6 * HOUR },
  artist:     { staleTime: 30 * MIN,   gcTime: 6 * HOUR },
  lyrics:     { staleTime: 6 * HOUR,   gcTime: DAY },
};

export default queryKeys;
