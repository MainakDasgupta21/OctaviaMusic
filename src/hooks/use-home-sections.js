import { useMemo } from 'react';
import { sanitizeImageUrl, sanitizeTrack } from '@/lib/media-sanitize';
import { pickWeeklySpotlight } from '@/lib/spotlight-pick';

const DAILY_MIX_FALLBACK = '/placeholders/daily-mix.svg';

const artistKey = (value) =>
  (value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const byCountThenName = (a, b) => {
  if (b.count !== a.count) return b.count - a.count;
  return a.artist.localeCompare(b.artist);
};

export const pickHero = (featured, now = new Date()) => {
  if (!Array.isArray(featured) || featured.length === 0) return null;
  return featured[now.getDay() % featured.length];
};

export const buildDailyMixes = ({ history = [], favorites = [], max = 6 } = {}) => {
  const seed = [...history, ...favorites];
  const map = new Map();

  seed.forEach((row) => {
    const track = sanitizeTrack(row);
    if (!track?.artist) return;

    const key = artistKey(track.artist);
    if (!key) return;

    const existing = map.get(key) || {
      key,
      artist: track.artist,
      count: 0,
      sampleTrack: null,
    };

    existing.count += 1;
    existing.sampleTrack =
      existing.sampleTrack ||
      (track.videoId ? sanitizeTrack(track, { requirePlayable: true }) : null);
    map.set(key, existing);
  });

  return Array.from(map.values())
    .sort(byCountThenName)
    .slice(0, max)
    .map((entry, index) => ({
      id: `mix-${entry.key}`,
      key: entry.key,
      label: `Daily Mix ${index + 1}`,
      artist: entry.artist,
      sampleTrack: entry.sampleTrack,
      thumbnail: sanitizeImageUrl(entry.sampleTrack?.thumbnail, { fallback: DAILY_MIX_FALLBACK }),
      to: `/explore?artist=${encodeURIComponent(entry.artist)}`,
    }));
};

export const buildTopArtists = ({ history = [], max = 8 } = {}) => {
  const byArtist = new Map();

  history.forEach((row) => {
    const track = sanitizeTrack(row);
    if (!track?.artist) return;

    const key = artistKey(track.artist);
    if (!key) return;

    const existing = byArtist.get(key) || {
      key,
      artist: track.artist,
      slug: null,
      sample: null,
      count: 0,
    };

    existing.count += 1;
    existing.slug = existing.slug || track.artistSlug || null;
    existing.sample = existing.sample || sanitizeImageUrl(track.thumbnail);
    byArtist.set(key, existing);
  });

  return Array.from(byArtist.values())
    .sort(byCountThenName)
    .slice(0, max);
};

// Pick the "Featured artist this week" — a composite-scored, weighted-random,
// weekly-seeded draw from the charts + trending pool. See
// [src/lib/spotlight-pick.js](src/lib/spotlight-pick.js) for the scoring math
// and rotation logic. The return shape is a superset of the legacy
// {key, artist, slug, sample, count} payload so HomePage keeps working.
export const pickSpotlightArtist = ({ charts = [], trending = [], now } = {}) =>
  pickWeeklySpotlight({ charts, trending, now });

export const buildSectionOrdinals = ({
  hasHistory = false,
  hasTrending = true,
  hasTopCharts = false,
  hasFreshFinds = false,
  hasRisingNow = false,
  hasDailyMixes = false,
  hasTopArtists = false,
} = {}) => {
  const keys = [];
  if (hasHistory) keys.push('history');
  if (hasTrending) keys.push('trending');
  if (hasTopCharts) keys.push('topCharts');
  if (hasFreshFinds) keys.push('freshFinds');
  if (hasRisingNow) keys.push('risingNow');
  if (hasDailyMixes) keys.push('dailyMixes');
  if (hasTopArtists) keys.push('topArtists');

  return Object.fromEntries(keys.map((key, index) => [key, index + 1]));
};

export const useHomeSections = ({
  featured = [],
  trending = [],
  charts = [],
  history = [],
  favorites = [],
} = {}) => {
  const hero = useMemo(() => pickHero(featured), [featured]);
  const trendingPreview = useMemo(() => trending.slice(0, 12), [trending]);
  // The middle slice of the trending payload becomes a "Fresh finds" rail —
  // tracks 13-20. With the higher TRENDING_LIMIT this stays an 8-row strip
  // and leaves the deeper 21-40 range for "Rising now".
  const freshFinds = useMemo(() => trending.slice(12, 20), [trending]);
  // Deeper slice of trending — 20 fresh tracks that wouldn't otherwise be
  // visible on Home. Surfaced as the "Rising now" rail.
  const risingNow = useMemo(() => trending.slice(20, 40), [trending]);
  const dailyMixes = useMemo(
    () => buildDailyMixes({ history, favorites }),
    [history, favorites],
  );
  const topArtists = useMemo(() => buildTopArtists({ history }), [history]);

  // Spotlight artist — pick once per (charts, trending) update. Returns the
  // most-occurring artist with a resolvable slug, or `null` when nothing
  // qualifies (e.g. cold backend).
  const spotlightSeed = useMemo(
    () => pickSpotlightArtist({ charts, trending }),
    [charts, trending],
  );

  // Cold start = brand-new visitor with no personal signal. Home uses this to
  // promote the discovery scaffolding (moods + starters) above the fold.
  const coldStart = history.length === 0 && favorites.length === 0;

  const ordinals = useMemo(
    () =>
      buildSectionOrdinals({
        hasHistory: history.length > 0,
        hasTrending: true,
        hasTopCharts: charts.length > 0,
        hasFreshFinds: freshFinds.length > 0,
        hasRisingNow: risingNow.length > 0,
        hasDailyMixes: dailyMixes.length > 0,
        hasTopArtists: topArtists.length > 0,
      }),
    [
      charts.length,
      dailyMixes.length,
      freshFinds.length,
      history.length,
      risingNow.length,
      topArtists.length,
    ],
  );

  return {
    hero,
    trendingPreview,
    freshFinds,
    risingNow,
    spotlightSeed,
    dailyMixes,
    topArtists,
    coldStart,
    ordinals,
  };
};

export default useHomeSections;
