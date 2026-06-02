const express = require('express');
const cors = require('cors');
const catalog = require('./data/catalog');
const ytm = require('./lib/ytmusic');
const {
  toTrackDTO,
  toAlbumSummaryDTO,
  toAlbumDetailDTO,
  toArtistSummaryDTO,
  toArtistDetailDTO,
} = require('./lib/mappers');

const app = express();
// Dev-time CORS: allow any localhost / 127.0.0.1 origin. Vite picks the next
// free port when 8080 is taken, so hard-coding a single port keeps biting us.
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return cb(null, true);
      }
      cb(null, false);
    },
  }),
);
app.use(express.json());

// -----------------------------------------------------------------------------
// Small helpers
// -----------------------------------------------------------------------------

// `send(res, payload)` keeps the 404 shape stable for `isNotFoundError` checks
// in `src/lib/api.js`.
const send = (res, payload) => {
  if (payload == null) {
    return res.status(404).json({ error: 'Not found' });
  }
  return res.json(payload);
};

// Wrap a live-data attempt with a catalog fallback. Logs (once) so dev knows
// when YTM rate-limits / network drops and the static catalog took over.
const liveOrFallback = async (live, fallback, label) => {
  try {
    return await live();
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

// =============================================================================
// Search — `type` matches the UI filter chips. The frontend expects a flat
// array even for `all`, so we merge songs/artists/albums in that order.
// =============================================================================
app.get('/api/search', async (req, res) => {
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
  res.json(await liveOrFallback(live, fallback, `search(${safeType}, ${q})`));
});

// =============================================================================
// Detail endpoints
// =============================================================================
app.get('/api/album/:id', async (req, res) => {
  const { id } = req.params;
  const payload = await liveOrFallback(
    async () => {
      const album = await ytm.getAlbum(id);
      return toAlbumDetailDTO(album, { resolveVideoId: ytm.resolveVideoId });
    },
    () => catalog.getAlbum(id),
    `album(${id})`,
  );
  send(res, payload);
});

app.get('/api/artist/:slugOrId', async (req, res) => {
  const { slugOrId } = req.params;
  const payload = await liveOrFallback(
    async () => {
      const artist = await ytm.getArtist(slugOrId);
      return toArtistDetailDTO(artist, { resolveVideoId: ytm.resolveVideoId });
    },
    () => catalog.getArtist(slugOrId),
    `artist(${slugOrId})`,
  );
  send(res, payload);
});

// =============================================================================
// Charts — synthesize rank + previous rank so the UI can render the arrows.
// =============================================================================
app.get('/api/charts', async (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));

  const live = async () => {
    const rows = await ytm.getChartsLive(limit);
    const tracks = dedupeById(rows.map((r) => toTrackDTO(r)).filter(Boolean)).slice(0, limit);
    return tracks.map((t, i) => {
      // Stable, deterministic pseudo-previous rank purely for the UI arrows.
      const seed = (t.id.charCodeAt(0) + i) % 7;
      const drift = seed - 3;
      const prev = Math.max(1, Math.min(tracks.length, i + 1 + drift));
      return { ...t, rank: i + 1, prev };
    });
  };

  const fallback = () => catalog.getCharts(limit);
  res.json(await liveOrFallback(live, fallback, 'charts'));
});

// =============================================================================
// Trending
// =============================================================================
app.get('/api/trending', async (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 20));

  const live = async () => {
    const rows = await ytm.getTrendingLive(limit);
    return dedupeById(rows.map((r) => toTrackDTO(r)).filter(Boolean)).slice(0, limit);
  };

  const fallback = () => catalog.getTrending(limit);
  res.json(await liveOrFallback(live, fallback, 'trending'));
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

app.get('/api/home/featured', async (_req, res) => {
  const live = async () => {
    const rows = await ytm.getChartsLive(6);
    const tracks = dedupeById(rows.map((r) => toTrackDTO(r)).filter(Boolean)).slice(0, 3);
    if (tracks.length === 0) throw new Error('no live tracks');
    return tracks.map((track, i) => ({
      id: `feat-${track.id}`,
      eyebrow: HOME_EYEBROWS[i % HOME_EYEBROWS.length],
      title: HOME_TITLES[i % HOME_TITLES.length],
      description: HOME_DESCRIPTIONS[i % HOME_DESCRIPTIONS.length],
      cover: track.thumbnail,
      track,
      // Prefer an album destination, then artist, then the player.
      to: track.albumId
        ? `/album/${track.albumId}`
        : track.artistSlug
          ? `/artist/${track.artistSlug}`
          : '/player',
    }));
  };

  const fallback = () => catalog.getHomeFeatured();
  res.json(await liveOrFallback(live, fallback, 'home/featured'));
});

// =============================================================================
// Genres — keep the static gradient + label catalog (so the UI styling
// matches) but enrich each card with a live sample track + thumbnail.
// =============================================================================
app.get('/api/genres', async (_req, res) => {
  const live = async () => {
    const base = catalog.getGenres(); // gradients + labels (and seed sample)
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
  res.json(await liveOrFallback(live, fallback, 'genres'));
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
