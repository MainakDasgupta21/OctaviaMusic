const express = require('express');
const cors = require('cors');
const compression = require('compression');
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
const { aggregateTopArtists } = require('./lib/aggregators');

const app = express();
app.set('trust proxy', 1);
// Strong ETags so browsers + CDNs can issue cheap If-None-Match revalidations
// against our JSON. Pairs with the per-route Cache-Control + SWR set in
// setCacheHeaders below.
app.set('etag', 'strong');

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
// Gzip JSON responses. Threshold 1 KB skips tiny payloads where the framing
// overhead would dominate; the level=6 default is a good size/CPU trade-off.
app.use(
  compression({
    threshold: 1024,
    // Honour an explicit `x-no-compression` opt-out from synthetic clients.
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
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

// Lyrics calls hit an external provider; keep them throttled per-IP so a
// single client can't blow through LRCLib's politeness budget.
const lyricsLimiter = rateLimit({
  windowMs: Number(process.env.LYRICS_RATE_LIMIT_WINDOW_MS) || 60_000,
  max: Number(process.env.LYRICS_RATE_LIMIT_MAX) || 60,
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
  // Origin TTL = `safeTtl`. SWR window doubles that so a CDN can serve a
  // slightly stale answer instantly while it revalidates in the background.
  const swr = Math.min(3600, safeTtl * 2);
  // Browser keeps a short-lived copy so back-to-back keystrokes / re-renders
  // don't re-fetch over the network. Keep `max-age` ≤ `s-maxage` so shared
  // caches hold canonical answers longer than individual browsers.
  const browserMaxAge = Math.min(safeTtl, 120);
  res.set(
    'Cache-Control',
    `public, max-age=${browserMaxAge}, s-maxage=${safeTtl}, stale-while-revalidate=${swr}`,
  );
};

// =============================================================================
// Search — `type` matches the UI filter chips. The frontend expects a flat
// array even for `all`, so we merge songs/artists/albums in that order.
// =============================================================================
const clampInt = (raw, { min, max, fallback }) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
};

// `?limit=N` lets richer surfaces (SearchPage, Cmd+K) ask for a longer feed
// while the TopBar can stay lean. Capped at 60 to keep the upstream and the
// memo cache bounded.
const DEFAULT_SEARCH_LIMIT = 30;
const MAX_SEARCH_LIMIT = 60;

app.get('/api/search', searchLimiter, async (req, res) => {
  const q = String(req.query.q || '').trim();
  const type = (req.query.type || req.query.filter || 'all').toString();
  const allowed = new Set(['all', 'song', 'artist', 'album', 'playlist']);
  const safeType = allowed.has(type) ? type : 'all';
  const limit = clampInt(req.query.limit, {
    min: 1,
    max: MAX_SEARCH_LIMIT,
    fallback: DEFAULT_SEARCH_LIMIT,
  });

  // Playlists are client-owned; the live source doesn't surface community
  // playlists in a meaningful way for this app.
  if (safeType === 'playlist') return res.json([]);
  if (!q) return res.json([]);

  // For the 'all' branch we split the limit roughly proportionally across
  // buckets so a `limit=60` request gets ~25 songs / 12 artists / 12 albums
  // (or scaled-up versions). Per-type calls just use the raw limit.
  const allCaps = (() => {
    const songs   = Math.max(15, Math.min(40, Math.round(limit * 0.6)));
    const artists = Math.max(8,  Math.min(20, Math.round(limit * 0.25)));
    const albums  = Math.max(8,  Math.min(20, Math.round(limit * 0.25)));
    return { songs, artists, albums };
  })();

  const live = async () => {
    if (safeType === 'song') {
      const data = await ytm.searchByType(q, safeType, limit);
      return dedupeById(data.map((s) => toTrackDTO(s)).filter(Boolean));
    }
    if (safeType === 'artist') {
      const data = await ytm.searchByType(q, safeType, limit);
      return dedupeById(data.map(toArtistSummaryDTO).filter(Boolean));
    }
    if (safeType === 'album') {
      const data = await ytm.searchByType(q, safeType, limit);
      return dedupeById(data.map(toAlbumSummaryDTO).filter(Boolean));
    }
    // 'all' → merged shape from searchByType
    const data = await ytm.searchByType(q, safeType, undefined, { limits: allCaps });
    const songs   = (data.songs   || []).map((s) => toTrackDTO(s)).filter(Boolean);
    const artists = (data.artists || []).map(toArtistSummaryDTO).filter(Boolean);
    const albums  = (data.albums  || []).map(toAlbumSummaryDTO).filter(Boolean);
    return dedupeById([...songs, ...artists, ...albums]);
  };

  const fallback = () => catalog.search(q, safeType);
  const payload = await liveOrFallback(live, fallback, `search(${safeType}, ${q})`);
  // Search responses are dynamic but the same query is often repeated within
  // seconds (TopBar + SearchPage + Cmd+K). A 2 minute origin TTL with SWR
  // lets browsers / CDNs serve back-to-back hits without hitting the upstream.
  setCacheHeaders(res, 120);
  res.json(payload);
});

// =============================================================================
// Search suggestions — wraps YTM's real autocomplete endpoint. Returns plain
// strings the frontend renders as suggestion chips and uses as a typo-recovery
// fallback when the main search comes back empty. Best-effort: failures
// resolve to `[]` rather than 5xx so the input never becomes blocked.
// =============================================================================
app.get('/api/search/suggestions', searchLimiter, async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) {
    setCacheHeaders(res, 120);
    return res.json({ suggestions: [] });
  }

  const live = () => ytm.getSearchSuggestions(q);
  const fallback = () => [];
  const suggestions = await liveOrFallback(
    live,
    fallback,
    `searchSuggestions(${q})`,
    { treatEmptyAsFailure: false },
  );
  setCacheHeaders(res, 120);
  res.json({ suggestions });
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
// Charts — artists. Derived by aggregating the per-track chart by artist (see
// server/lib/aggregators.js). region/window are accepted for symmetry with
// /api/charts so the client's query key stays stable across regional toggles
// once the upstream supports them. We pull a wider 200-track sample upstream
// to give the aggregator enough signal for a useful Top-50 artist ranking.
// =============================================================================
app.get('/api/charts/artists', searchLimiter, async (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
  const region = String(req.query.region || 'global');
  const chartWindow = String(req.query.window || 'weekly');

  const live = async () => {
    const rows = await ytm.getChartsLive(200);
    const tracks = dedupeById(rows.map((r) => toTrackDTO(r)).filter(Boolean))
      .map((t, i) => ({ ...t, rank: i + 1 }));
    const items = aggregateTopArtists(tracks, { limit });
    if (items.length === 0) throw new Error('no live artist chart');
    return {
      items,
      meta: { source: 'live', region, window: chartWindow, generatedAt: new Date().toISOString() },
    };
  };

  const fallback = () => {
    const items = aggregateTopArtists(catalog.getCharts(200), { limit });
    return {
      items,
      meta: { source: 'fallback', region, window: chartWindow, generatedAt: new Date().toISOString() },
    };
  };

  setCacheHeaders(res);
  res.json(await liveOrFallback(live, fallback, 'charts:artists', { treatEmptyAsFailure: false }));
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

// /api/home/featured only needs the 3 chart-derived feature cards; skip the
// trending fetch entirely. Reuses the same charts memo as /api/home so the
// upstream playlist is fetched once and shared.
const getHomeFeaturedLive = async () => {
  const chartsRows = await ytm.getChartsLive(6).catch(() => []);
  const charts = dedupeById(chartsRows.map((r) => toTrackDTO(r)).filter(Boolean));
  if (charts.length === 0) throw new Error('no live tracks');
  return charts.slice(0, 3).map(toHomeFeature);
};

app.get('/api/home', homeLimiter, async (req, res) => {
  const limit = Math.max(6, Math.min(100, Number(req.query.limit) || 20));
  const payload = await getHomePayload(limit);
  setCacheHeaders(res);
  res.json(payload);
});

app.get('/api/home/featured', homeLimiter, async (_req, res) => {
  const featured = await liveOrFallback(
    getHomeFeaturedLive,
    () => catalog.getHomeFeatured(),
    'home/featured',
  );
  setCacheHeaders(res);
  res.json(featured);
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
app.get('/api/lyrics', lyricsLimiter, async (req, res) => {
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
      // Short cache on misses so we don't pound LRCLib for the same not-found,
      // but keep them re-checkable in ~5 min.
      setCacheHeaders(res, 300, 600);
      return res.status(404).json({ error: 'Lyrics not found' });
    }
    // Hits are aggressively cacheable: lyrics don't change.
    setCacheHeaders(res, 3600, 86400);
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

  // Background warm-up: pay the YTMusic InnerTube handshake + the most-likely
  // chart/trending playlist fetch BEFORE the first client asks, so cold-start
  // latency lands on the server boot, not on the user's first request.
  // Skip in test environments to keep test runs hermetic.
  if (process.env.NODE_ENV === 'test' || process.env.YTM_WARMUP === 'false') return;
  setImmediate(async () => {
    const t0 = Date.now();
    const results = await Promise.allSettled([
      ytm.getYTMusic(),
      ytm.getChartsLive(50).catch(() => []),
      ytm.getTrendingLive(50).catch(() => []),
    ]);
    const failed = results.filter((r) => r.status === 'rejected').length;
    const elapsed = Date.now() - t0;
    if (failed === 0) {
      console.log(`[warmup] YTMusic ready, charts + trending primed (${elapsed}ms)`);
    } else {
      console.warn(
        `[warmup] completed in ${elapsed}ms with ${failed}/${results.length} failures (will retry on demand)`,
      );
    }
  });
});
