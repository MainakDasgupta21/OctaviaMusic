import { useMemo } from 'react';
import { sanitizeImageUrl, sanitizeTrack } from '@/lib/media-sanitize';

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

export const buildSectionOrdinals = ({
  hasHistory = false,
  hasTrending = true,
  hasDailyMixes = false,
  hasTopArtists = false,
} = {}) => {
  const keys = [];
  if (hasHistory) keys.push('history');
  if (hasTrending) keys.push('trending');
  if (hasDailyMixes) keys.push('dailyMixes');
  if (hasTopArtists) keys.push('topArtists');

  return Object.fromEntries(keys.map((key, index) => [key, index + 1]));
};

export const useHomeSections = ({
  featured = [],
  trending = [],
  history = [],
  favorites = [],
} = {}) => {
  const hero = useMemo(() => pickHero(featured), [featured]);
  const trendingPreview = useMemo(() => trending.slice(0, 12), [trending]);
  const dailyMixes = useMemo(
    () => buildDailyMixes({ history, favorites }),
    [history, favorites],
  );
  const topArtists = useMemo(() => buildTopArtists({ history }), [history]);

  const ordinals = useMemo(
    () =>
      buildSectionOrdinals({
        hasHistory: history.length > 0,
        hasTrending: true,
        hasDailyMixes: dailyMixes.length > 0,
        hasTopArtists: topArtists.length > 0,
      }),
    [dailyMixes.length, history.length, topArtists.length],
  );

  return {
    hero,
    trendingPreview,
    dailyMixes,
    topArtists,
    ordinals,
  };
};

export default useHomeSections;
