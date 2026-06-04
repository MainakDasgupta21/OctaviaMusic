const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const catalog = require('./data/catalog');
const ytm = require('./lib/ytmusic');
const { getLyrics } = require('./lib/lyrics');
const {
  toTrackDTO,
  toAlbumSummaryDTO,
  toAlbumDetailDTO,
  toArtistSummaryDTO,
  toArtistDetailDTO,
} = require('./lib/mappers');

const app = express();
app.set('trust proxy', 1);

const DEV_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const parseOrigins = (value) =>
  String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const configuredOrigins = parseOrigins(process.env.CORS_ORIGIN);

const isCorsOriginAllowed = (origin) => {
  if (!origin) return true;
  if (configuredOrigins.includes('*') || configuredOrigins.includes(origin)) return true;
  if (DEV_ORIGIN_RE.test(origin)) return true;
  return false;
};

if (process.env.NODE_ENV === 'production' && configuredOrigins.length === 0) {
  console.warn('[cors] CORS_ORIGIN is not set. Only localhost origins are currently allowed.');
}

app.use(
  cors({
    origin: (origin, cb) => {
      cb(null, isCorsOriginAllowed(origin));
    },
  }),
);
app.use(express.json());

const homeLimiter = rateLimit({
  windowMs: Number(process.env.HOME_RATE_LIMIT_WINDOW_MS) || 60_000,
  max: Number(process.env.HOME_RATE_LIMIT_MAX) || 120,
  standardHeaders: true,
  legacyHeaders: false,
});

// Search-style endpoints get a slightly more permissive bucket so live typing
// in the topbar doesn't trip the limiter.
const searchLimiter = rateLimit({
  windowMs: Number(process.env.SEARCH_RATE_LIMIT_WINDOW_MS) || 60_000,
  max: Number(process.env.SEARCH_RATE_LIMIT_MAX) || 240,
  standardHeaders: true,
  legacyHeaders: false,
});

// Album/artist details are heavy on the upstream — keep this conservative.
const detailLimiter = rateLimit({
  windowMs: Number(process.env.DETAIL_RATE_LIMIT_WINDOW_MS) || 60_000,
  max: Number(process.env.DETAIL_RATE_LIMIT_MAX) || 90,
  standardHeaders: true,
  legacyHeaders: false,
});

const YT_CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{20,}$/;

// -----------------------------------------------------------------------------
// Small helpers
// -----------------------------------------------------------------------------

// `send(res, payload)` keeps the 404 shape stable for `isNotFoundError` checks
// in `src/lib/api.js`. Includes `path` so debug logs / Sentry breadcrumbs can
// disambiguate which detail endpoint failed.
const send = (req, res, payload) => {
  if (payload == null) {
    return res.status(404).json({ error: 'Not found', path: req.path });
  }
  return res.json(payload);
};

// True when a live response is "empty enough" that we should fall back to the
// catalog to keep the UI populated (vs. silently rendering an empty page).
const isEmptyResult = (value) => {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') {
    if (Array.isArray(value.items)) return value.items.length === 0;
    if (Array.isArray(value.tracks)) return value.tracks.length === 0;
  }
  return false;
};

// Wrap a live-data attempt with a catalog fallback. Logs (once) so dev knows
// when YTM rate-limits / network drops and the static catalog took over.
// Treats empty live arrays as a soft failure so we never serve a blank page
// when the upstream answers fast but with nothing.
const liveOrFallback = async (live, fallback, label, options = {}) => {
  const { treatEmptyAsFailure = true } = options;
  try {
    const result = await live();
    if (treatEmptyAsFailure && isEmptyResult(result)) {
      console.warn(`[ytmusic] ${label} live returned empty, using fallback`);
      return fallback();
    }
    return result;
  } catch (err) {
    console.warn(`[ytmusic] ${label} live failed, using fallback:`, err?.message || err);
    return fallback();
  }
};

// Dedupe an array of DTOs by `id` (last write wins) preserving order.
const dedupeById = (rows) => {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    if (!r || !r.id || seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
  }
  return out;
};

const setCacheHeaders = (res, ttlSec = Number(process.env.HOME_CACHE_TTL_SEC) || 300) => {
  const safeTtl = Math.max(30, Math.min(3600, ttlSec));
  res.set(
    'Cache-Control',
    `public, max-age=60, s-maxage=${safeTtl}, stale-while-revalidate=${safeTtl}`,
  );
};

// =============================================================================
// Search — `type` matches the UI filter chips. The frontend expects a flat
// array even for `all`, so we merge songs/artists/albums in that order.
// =============================================================================
app.get('/api/search', searchLimiter, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const type = (req.query.type || req.query.filter || 'all').toString();
  const allowed = new Set(['all', 'song', 'artist', 'album', 'playlist']);
  const safeType = allowed.has(type) ? type : 'all';

  // Playlists are client-owned; the live source doesn't surface community
  // playlists in a meaningful way for this app.
  if (safeType === 'playlist') return res.json([]);
  if (!q) return res.json([]);

  const live = async () => {
    const data = await ytm.searchByType(q, safeType);
    if (safeType === 'song') {
      return dedupeById(data.map((s) => toTrackDTO(s)).filter(Boolean));
    }
    if (safeType === 'artist') {
      return dedupeById(data.map(toArtistSummaryDTO).filter(Boolean));
    }
    if (safeType === 'album') {
      return dedupeById(data.map(toAlbumSummaryDTO).filter(Boolean));
    }
    // 'all' → merged shape from searchByType
    const songs   = (data.songs   || []).map((s) => toTrackDTO(s)).filter(Boolean);
    const artists = (data.artists || []).map(toArtistSummaryDTO).filter(Boolean);
    const albums  = (data.albums  || []).map(toAlbumSummaryDTO).filter(Boolean);
    return dedupeById([...songs, ...artists, ...albums]);
  };

  const fallback = () => catalog.search(q, safeType);
  const payload = await liveOrFallback(live, fallback, `search(${safeType}, ${q})`);
  setCacheHeaders(res, 60);
  res.json(payload);
});

// =============================================================================
// Detail endpoints
// =============================================================================
app.get('/api/album/:id', detailLimiter, async (req, res) => {
  const { id } = req.params;
  const payload = await liveOrFallback(
    async () => {
      const album = await ytm.getAlbum(id);
      const dto = await toAlbumDetailDTO(album, { resolveVideoId: ytm.resolveVideoId });
      // An album with zero playable tracks is indistinguishable from a 404 to the
      // user; let the catalog fallback try if available.
      if (!dto || !Array.isArray(dto.tracks) || dto.tracks.length === 0) return null;
      return dto;
    },
    () => catalog.getAlbum(id),
    `album(${id})`,
  );
  setCacheHeaders(res, 30 * 60);
  send(req, res, payload);
});

app.get('/api/artist/:slugOrId', detailLimiter, async (req, res) => {
  const { slugOrId } = req.params;
  const looksLikeChannelId = YT_CHANNEL_ID_RE.test(slugOrId);

  const live = async () => {
    // 1. Direct hit when the param is already a YTM channel id.
    if (looksLikeChannelId) {
      const artist = await ytm.getArtist(slugOrId);
      return toArtistDetailDTO(artist, { resolveVideoId: ytm.resolveVideoId });
    }
    // 2. Human slug → reverse to a channel id via search, then fetch.
    const humanQuery = String(slugOrId || '').replace(/-/g, ' ').trim();
    if (!humanQuery) return null;
    const candidates = (await ytm.searchByType(humanQuery, 'artist')) || [];
    const list = Array.isArray(candidates) ? candidates : candidates.artists || [];
    const match = list.find((a) => a?.artistId);
    if (!match?.artistId) return null;
    const artist = await ytm.getArtist(match.artistId);
    return toArtistDetailDTO(artist, { resolveVideoId: ytm.resolveVideoId });
  };

  const payload = await liveOrFallback(
    live,
    () => catalog.getArtist(slugOrId),
    `artist(${slugOrId})`,
  );
  setCacheHeaders(res, 30 * 60);
  send(req, res, payload);
});

// =============================================================================
// Charts — synthesize rank + previous rank so the UI can render the arrows.
// =============================================================================
app.get('/api/charts', searchLimiter, async (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
  // region/window are reserved for when the live source supports them; we
  // accept them today so the query key on the client is stable.
  const region = String(req.query.region || 'global');
  const chartWindow = String(req.query.window || 'weekly');

  const live = async () => {
    const rows = await ytm.getChartsLive(limit);
    const tracks = dedupeById(rows.map((r) => toTrackDTO(r)).filter(Boolean)).slice(0, limit);
    if (tracks.length === 0) throw new Error('no live charts');
    return {
      items: tracks.map((t, i) => ({ ...t, rank: i + 1 })),
      meta: { source: 'live', region, window: chartWindow, generatedAt: new Date().toISOString() },
    };
  };

  const fallback = () => {
    const items = catalog.getCharts(limit);
    return {
      items,
      meta: { source: 'fallback', region, window: chartWindow, generatedAt: new Date().toISOString() },
    };
  };
  setCacheHeaders(res);
  res.json(await liveOrFallback(live, fallback, 'charts', { treatEmptyAsFailure: false }));
});

// =============================================================================
// Trending
// =============================================================================
app.get('/api/trending', homeLimiter, async (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));

  const live = async () => {
    const rows = await ytm.getTrendingLive(limit);
    const items = dedupeById(rows.map((r) => toTrackDTO(r)).filter(Boolean)).slice(0, limit);
    if (items.length === 0) throw new Error('no live trending');
    return items;
  };

  const fallback = () => catalog.getTrending(limit);
  const payload = await liveOrFallback(live, fallback, 'trending');
  setCacheHeaders(res);
  res.json(payload);
});

// =============================================================================
// Home featured — three editorial picks built from the charts head, paired
// with a small bank of evergreen copy. Falls back to the curated catalog when
// the live request fails.
// =============================================================================
const HOME_EYEBROWS = ['Featured today', 'New release', 'On repeat'];
const HOME_TITLES = [
  'The track everyone is on',
  'Fresh on the rotation',
  'A familiar favourite',
];
const HOME_DESCRIPTIONS = [
  'The number-one record right now \u2014 a single tap and you\u2019re in.',
  'Hand-picked from this week\u2019s newest drops.',
  'Pulled from the global chart, sized for a slow afternoon.',
];

const toHomeFeature = (track, index) => ({
  id: `feat-${track.id}`,
  eyebrow: HOME_EYEBROWS[index % HOME_EYEBROWS.length],
  title: HOME_TITLES[index % HOME_TITLES.length],
  description: HOME_DESCRIPTIONS[index % HOME_DESCRIPTIONS.length],
  cover: track.thumbnail,
  track,
  to: track.albumId
    ? `/album/${track.albumId}`
    : track.artistSlug
      ? `/artist/${track.artistSlug}`
      : '/player',
});

const getHomePayloadLive = async (limit = 20) => {
  // Featured comes from the chart head (highest-listened "right now"), but
  // trending has its own live endpoint with a different selection — running
  // both keeps Home in sync with /trending instead of duplicating charts.
  const [chartsRows, trendingRows] = await Promise.all([
    ytm.getChartsLive(Math.max(limit, 6)).catch(() => []),
    ytm.getTrendingLive(limit).catch(() => []),
  ]);
  const charts = dedupeById(chartsRows.map((r) => toTrackDTO(r)).filter(Boolean)).slice(0, limit);
  const trending = dedupeById(trendingRows.map((r) => toTrackDTO(r)).filter(Boolean)).slice(0, limit);
  if (charts.length === 0 && trending.length === 0) throw new Error('no live tracks');
  // Fall back to charts-as-trending only when /trending live fails outright.
  const trendingPayload = trending.length > 0 ? trending : charts;
  return {
    featured: charts.slice(0, 3).map(toHomeFeature),
    trending: trendingPayload,
    meta: { source: 'live', generatedAt: new Date().toISOString() },
  };
};

const getHomePayloadFallback = (limit = 20) => ({
  featured: catalog.getHomeFeatured(),
  trending: catalog.getTrending(limit),
  meta: { source: 'fallback', generatedAt: new Date().toISOString() },
});

const getHomePayload = (limit, label = `home(${limit})`) =>
  liveOrFallback(
    () => getHomePayloadLive(limit),
    () => getHomePayloadFallback(limit),
    label,
  );

app.get('/api/home', homeLimiter, async (req, res) => {
  const limit = Math.max(6, Math.min(100, Number(req.query.limit) || 20));
  const payload = await getHomePayload(limit);
  setCacheHeaders(res);
  res.json(payload);
});

app.get('/api/home/featured', homeLimiter, async (_req, res) => {
  const payload = await getHomePayload(20, 'home/featured');
  setCacheHeaders(res);
  res.json(payload.featured);
});

// =============================================================================
// Genres — keep the static gradient + label catalog (so the UI styling
// matches) but enrich each card with a live sample track + thumbnail.
// =============================================================================
app.get('/api/genres', searchLimiter, async (_req, res) => {
  const live = async () => {
    const base = catalog.getGenres(); // gradients + labels (and seed sample)
    if (!Array.isArray(base) || base.length === 0) throw new Error('no genre seed');
    const enriched = await Promise.all(
      base.map(async (g) => {
        try {
          const sample = await ytm.getGenreSample(g.label);
          const sampleTrack = sample ? toTrackDTO(sample) : g.sampleTrack;
          return {
            ...g,
            thumbnail: sampleTrack?.thumbnail || g.thumbnail,
            sampleTrack: sampleTrack || g.sampleTrack,
          };
        } catch {
          return g;
        }
      }),
    );
    return enriched;
  };

  const fallback = () => catalog.getGenres();
  setCacheHeaders(res, 60 * 60);
  res.json(await liveOrFallback(live, fallback, 'genres'));
});

// =============================================================================
// Lyrics — proxy LRCLib through the backend so the client isn't exposed to
// browser CORS / header constraints. The helper performs strict + relaxed
// fallback lookups and caches both hits and misses.
// =============================================================================
app.get('/api/lyrics', async (req, res) => {
  const title = String(req.query.title || '').trim();
  const artist = String(req.query.artist || '').trim();
  const durationRaw = Number(req.query.duration);
  const durationSec = Number.isFinite(durationRaw) && durationRaw > 0
    ? durationRaw
    : undefined;

  if (!title || !artist) {
    return res.status(400).json({ error: 'title and artist are required' });
  }

  try {
    const payload = await getLyrics({ title, artist, durationSec });
    if (!payload) {
      return res.status(404).json({ error: 'Lyrics not found' });
    }
    return res.json(payload);
  } catch (err) {
    console.warn(
      `[lyrics] lookup failed for "${title}" by "${artist}":`,
      err?.message || err,
    );
    return res.status(502).json({ error: 'Lyrics provider unavailable' });
  }
});

// =============================================================================
// Health + 404 fallthrough
// =============================================================================
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
