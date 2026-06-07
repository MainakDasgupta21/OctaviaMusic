// =============================================================================
// Thin wrapper around `ytmusic-api`. Owns:
//   • a single, memoized YTMusic instance (initialized once)
//   • a TTL cache keyed by call signature so the upstream gets a steady RPS
//     even when several pages render at once
//   • narrow helpers that the route handlers compose
//
// The package ships as both ESM and CJS; we use the CJS entrypoint to keep
// the existing `require()`-based server.
// =============================================================================

const YTMusicMod = require('ytmusic-api');
const YTMusic = YTMusicMod.default || YTMusicMod;

// -----------------------------------------------------------------------------
// Config (env-driven). Numbers are minutes; the cache stores expiry timestamps.
// -----------------------------------------------------------------------------
const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const TTL = {
  search:  num(process.env.YTM_CACHE_SEARCH_MIN,    5) * 60_000,
  detail:  num(process.env.YTM_CACHE_DETAIL_MIN,   30) * 60_000,
  charts:  num(process.env.YTM_CACHE_CHARTS_MIN,   60) * 60_000,
  genres:  num(process.env.YTM_CACHE_GENRES_MIN,   60) * 60_000,
};
const REQUEST_TIMEOUT_MS = num(process.env.YTM_REQUEST_TIMEOUT_MS, 10_000);
const RETRY_COUNT = (() => {
  const n = Number(process.env.YTM_REQUEST_RETRY_COUNT);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 1;
})();

const CHARTS_PLAYLIST   = (process.env.YTM_CHARTS_PLAYLIST   || '').trim();
const TRENDING_PLAYLIST = (process.env.YTM_TRENDING_PLAYLIST || '').trim();

// Default public YouTube playlists (regular `PL...` ids). `getPlaylistVideos`
// reads these in ONE call and every row already carries a `videoId`, so charts
// / trending resolve in ~2s instead of fanning out dozens of per-song lookups.
// Overridable via the env vars above.
const DEFAULT_CHARTS_PLAYLIST   = 'PLFgquLnL59alCl_2TQvOiD5Vgm1hCaGSI';
const DEFAULT_TRENDING_PLAYLIST = 'PLgzTt0k8mXzEk586ze4BjvDXR7c-TUSnx';

// -----------------------------------------------------------------------------
// Lazy singleton. `initialize()` performs the InnerTube handshake; reusing
// the same instance keeps that warm across requests.
// -----------------------------------------------------------------------------
let ytmusicPromise = null;
const getYTMusic = () => {
  if (!ytmusicPromise) {
    ytmusicPromise = (async () => {
      const instance = new YTMusic();
      await withTimeout(
        () => instance.initialize(),
        Math.max(REQUEST_TIMEOUT_MS, 15_000),
        'ytmusic.initialize',
      );
      return instance;
    })().catch((err) => {
      // Allow a retry on the next call instead of pinning a failed instance.
      ytmusicPromise = null;
      throw err;
    });
  }
  return ytmusicPromise;
};

// -----------------------------------------------------------------------------
// In-memory TTL cache. Coalesces concurrent in-flight requests so a burst of
// page mounts only triggers one upstream call.
// Bounded with insertion-order LRU eviction so a long-running process can't
// leak memory through unique queries / IDs.
// -----------------------------------------------------------------------------
const cache = new Map(); // key -> { expires, value? , inflight? }
const CACHE_MAX = num(process.env.YTM_CACHE_MAX_ENTRIES, 500);

const touch = (key, entry) => {
  // Re-insert so this key becomes the most-recently used (Map iterates in
  // insertion order). Combined with the size cap below this is a tiny LRU.
  cache.delete(key);
  cache.set(key, entry);
};

const evictIfNeeded = () => {
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
};

const memo = async (key, ttlMs, producer) => {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.value !== undefined && hit.expires > now) {
    touch(key, hit);
    return hit.value;
  }
  if (hit && hit.inflight) return hit.inflight;

  const inflight = (async () => {
    try {
      const value = await producer();
      const entry = { value, expires: Date.now() + ttlMs };
      cache.set(key, entry);
      touch(key, entry);
      evictIfNeeded();
      return value;
    } catch (err) {
      cache.delete(key);
      throw err;
    }
  })();
  cache.set(key, { inflight, expires: 0 });
  return inflight;
};

// -----------------------------------------------------------------------------
// Timed + retried helper for upstream calls. A hung InnerTube call should
// fail fast so routes can fall back to local/static data.
// -----------------------------------------------------------------------------
const withTimeout = async (producer, timeoutMs = REQUEST_TIMEOUT_MS, label = 'ytmusic') => {
  let timer = null;
  try {
    return await Promise.race([
      Promise.resolve().then(producer),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const withRetry = async (fn, { retries = RETRY_COUNT } = {}) => {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt >= retries) break;
    }
  }
  throw lastError || new Error('YTMusic request failed');
};

const runYTMusic = (label, fn, options = {}) =>
  withRetry(
    () =>
      withTimeout(
        fn,
        options.timeoutMs || REQUEST_TIMEOUT_MS,
        label,
      ),
    { retries: options.retries },
  );

// -----------------------------------------------------------------------------
// Wrappers consumed by the route handlers. Each is cached and resolves to
// the raw ytmusic-api shapes; mapping to client DTOs happens in mappers.js.
// -----------------------------------------------------------------------------

// Note: in v5.3.1 of `ytmusic-api`, the `searchSongs` / `getArtistSongs` /
// `album.songs` / `topSongs` response paths all return records with an empty
// `videoId` (upstream parsing bug). The `searchVideos` and `topVideos` paths
// return proper videoIds, and a YouTube Music "song" is just a video on the
// same underlying catalog. So we consistently use the video paths to source
// playable tracks. The DTO mapping still presents them to the UI as
// `type: 'song'`.

// Drop entries that are clearly not single playable songs:
//   • no videoId / no name (parsing artifacts)
//   • >12 min ("hour-long compilations" leak into broad searches)
const isLikelySong = (row) => {
  if (!row || !row.videoId || !row.name) return false;
  const d = row.duration;
  if (d == null) return true; // unknown duration is fine
  return d > 30 && d < 720;
};

// Cache keys deliberately do NOT include `limit` — we always fetch the full
// upstream result and slice afterwards. That way a TopBar 10-row search and a
// SearchPage 60-row search for the same query share one upstream call.
const searchSongs = async (q, limit = 30) => {
  const rows = await memo(`search:vid:${q}`, TTL.search, async () => {
    const yt = await getYTMusic();
    const result = await runYTMusic(`ytm.searchVideos(${q})`, () => yt.searchVideos(q));
    return Array.isArray(result) ? result.filter(isLikelySong) : [];
  });
  return rows.slice(0, limit);
};

const searchArtists = async (q, limit = 20) => {
  const rows = await memo(`search:artist:${q}`, TTL.search, async () => {
    const yt = await getYTMusic();
    const result = await runYTMusic(`ytm.searchArtists(${q})`, () => yt.searchArtists(q));
    return Array.isArray(result) ? result : [];
  });
  return rows.slice(0, limit);
};

const searchAlbums = async (q, limit = 20) => {
  const rows = await memo(`search:album:${q}`, TTL.search, async () => {
    const yt = await getYTMusic();
    const result = await runYTMusic(`ytm.searchAlbums(${q})`, () => yt.searchAlbums(q));
    return Array.isArray(result) ? result : [];
  });
  return rows.slice(0, limit);
};

// Resolve a playable videoId for a (songName, artistName) pair by running a
// targeted `searchVideos` and picking the first hit. Heavily cached because
// album / artist details fan out into many of these in parallel.
const resolveVideoId = (songName, artistName) =>
  memo(`resolve:${artistName}|${songName}`, TTL.detail, async () => {
    const yt = await getYTMusic();
    const q = `${songName} ${artistName || ''}`.trim();
    const rows = await runYTMusic(`ytm.resolveVideoId(${q})`, () => yt.searchVideos(q));
    const hit = (rows || []).find((r) => r?.videoId);
    return hit || null;
  });

// Build a logged catch handler so upstream failures are visible in server
// logs instead of silently producing an empty bucket.
const logFail = (label, q) => (err) => {
  console.warn(`[ytm] ${label}(${q}) failed:`, err?.message || err);
  return [];
};

// Default per-bucket caps for the 'all' branch. The TopBar / SearchPage can
// raise these via the `limits` argument; the SearchPage typically wants more
// breathing room (40+) so the 80-row client display has enough fuel.
const DEFAULT_ALL_LIMITS = { songs: 25, artists: 12, albums: 12 };

// Stamp the upstream array index onto each row so the frontend can use
// "popularity from YTM ordering" as a real ranking signal. We can't get
// numeric play counts / monthly listeners from ytmusic-api v5.3.1 (the parser
// drops them), but the order YTM returns IS a popularity signal — top
// artists / songs come first.
const stampRanks = (rows, base = 0) => {
  if (!Array.isArray(rows)) return [];
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i] && typeof rows[i] === 'object' && rows[i]._rank == null) {
      rows[i]._rank = base + i;
    }
  }
  return rows;
};

const searchByType = async (q, type, limit, options = {}) => {
  const { limits } = options;
  switch (type) {
    case 'song':   return stampRanks(await searchSongs(q, limit));
    case 'artist': return stampRanks(await searchArtists(q, limit));
    case 'album':  return stampRanks(await searchAlbums(q, limit));
    case 'all':
    default: {
      const caps = { ...DEFAULT_ALL_LIMITS, ...(limits || {}) };
      // Run all three in parallel — they each share the same cache so this is
      // cheap when the user toggles filters back to 'all'.
      const [songs, artists, albums] = await Promise.all([
        searchSongs(q, caps.songs).catch(logFail('searchSongs', q)),
        searchArtists(q, caps.artists).catch(logFail('searchArtists', q)),
        searchAlbums(q, caps.albums).catch(logFail('searchAlbums', q)),
      ]);

      stampRanks(songs);
      stampRanks(artists);
      stampRanks(albums);

      // Fallback: when the per-query album endpoint returns nothing but we
      // *did* find matching artists, derive albums from the top artists'
      // discographies. v5.3.1's `searchAlbums` is fragile but `getArtistAlbums`
      // reliably returns the real catalog once we have an artistId.
      if (albums.length === 0 && artists.length > 0) {
        const candidates = artists.slice(0, 2).filter((a) => a?.artistId);
        const groups = await Promise.all(
          candidates.map((a) =>
            getArtistAlbums(a.artistId, caps.albums).catch(
              logFail(`getArtistAlbums(${a.artistId})`, q),
            ),
          ),
        );
        const seen = new Set();
        for (const group of groups) {
          for (const al of group) {
            if (!al?.albumId || seen.has(al.albumId)) continue;
            seen.add(al.albumId);
            // Fallback albums get a higher rank index than direct hits would
            // have; since direct hits are empty here we start at 0 + offset
            // for visual consistency across queries.
            al._rank = albums.length;
            albums.push(al);
            if (albums.length >= caps.albums) break;
          }
          if (albums.length >= caps.albums) break;
        }
      }

      return { songs, artists, albums };
    }
  }
};

// Real YTM autocomplete. Returns the user-friendly query strings YTM would
// suggest as you type (e.g. "michael jackson", "michael bolton" for "mich").
// Used by the frontend as both a UI affordance (suggestion chips) and a
// typo-correction fallback when the main search returns nothing.
const getSearchSuggestions = (q) =>
  memo(`suggestions:${q}`, TTL.search, async () => {
    const yt = await getYTMusic();
    const rows = await runYTMusic(
      `ytm.getSearchSuggestions(${q})`,
      () => yt.getSearchSuggestions(q),
    );
    if (!Array.isArray(rows)) return [];
    // Defensive normalization: `getSearchSuggestions` returns `string[]` in
    // v5.3.1, but if a future version starts returning objects we don't want
    // to crash callers — coerce to strings and drop empties.
    return rows
      .map((row) => (typeof row === 'string' ? row : row?.query || row?.text || ''))
      .map((s) => String(s).trim())
      .filter(Boolean);
  });

const getAlbum = (albumId) =>
  memo(`album:${albumId}`, TTL.detail, async () => {
    const yt = await getYTMusic();
    return runYTMusic(`ytm.getAlbum(${albumId})`, () => yt.getAlbum(albumId));
  });

const getArtist = (artistId) =>
  memo(`artist:${artistId}`, TTL.detail, async () => {
    const yt = await getYTMusic();
    return runYTMusic(`ytm.getArtist(${artistId})`, () => yt.getArtist(artistId));
  });

// Direct fan-out to an artist's full album list. We use this as a fallback in
// `searchByType('all')` because v5.3.1's `searchAlbums(query)` is unreliable
// for many queries (parsing returns empty rows or rows missing `albumId`).
// Once we have a matching artistId, `getArtistAlbums` reliably returns the
// real discography in `AlbumDetailed[]` shape. The full list is memoised by
// artistId so repeated lookups (different `limit`) share the same cache.
const getArtistAlbums = async (artistId, limit = 20) => {
  const rows = await memo(`artistAlbums:${artistId}`, TTL.detail, async () => {
    const yt = await getYTMusic();
    const result = await runYTMusic(
      `ytm.getArtistAlbums(${artistId})`,
      () => yt.getArtistAlbums(artistId),
    );
    return Array.isArray(result) ? result : [];
  });
  return rows.slice(0, limit);
};

const getPlaylistTracks = (playlistId) =>
  memo(`playlist:${playlistId}`, TTL.charts, async () => {
    const yt = await getYTMusic();
    const rows = await runYTMusic(
      `ytm.getPlaylistVideos(${playlistId})`,
      () => yt.getPlaylistVideos(playlistId),
    );
    return Array.isArray(rows) ? rows.filter(isLikelySong) : [];
  });

// -----------------------------------------------------------------------------
// Composite helpers for editorial / aggregate endpoints. These source from a
// playlist (single fast call, every row already playable) and only fall back
// to a broad video search if every playlist id fails.
// -----------------------------------------------------------------------------

// Try each playlist id in order; return the FULL first set that yields
// tracks. Callers slice to their requested limit so different limits share
// one upstream playlist fetch via the per-id memo cache.
const firstPlaylistWithTracks = async (ids) => {
  for (const id of ids) {
    if (!id) continue;
    try {
      const rows = await getPlaylistTracks(id);
      if (rows.length) return rows;
    } catch {
      /* try the next id */
    }
  }
  return [];
};

const getChartsLive = async (limit = 50) => {
  const rows = await memo(`charts:${CHARTS_PLAYLIST || 'def'}`, TTL.charts, async () => {
    const playlistRows = await firstPlaylistWithTracks([
      CHARTS_PLAYLIST,
      DEFAULT_CHARTS_PLAYLIST,
      DEFAULT_TRENDING_PLAYLIST,
    ]);
    if (playlistRows.length) return playlistRows;
    // Last-resort live source: a single filtered video search (no fan-out).
    // Cache a generous size so smaller-limit callers can re-use the slice.
    return searchSongs('top hits official music video', 100);
  });
  return rows.slice(0, limit);
};

const getTrendingLive = async (limit = 20) => {
  const rows = await memo(`trending:${TRENDING_PLAYLIST || 'def'}`, TTL.charts, async () => {
    const playlistRows = await firstPlaylistWithTracks([
      TRENDING_PLAYLIST,
      DEFAULT_TRENDING_PLAYLIST,
      DEFAULT_CHARTS_PLAYLIST,
    ]);
    if (playlistRows.length) return playlistRows;
    return searchSongs('new songs official music video', 100);
  });
  return rows.slice(0, limit);
};

const getGenreSample = (label) =>
  memo(`genre:${label}`, TTL.genres, async () => {
    const rows = await searchSongs(`${label} hits`, 1);
    return rows[0] || null;
  });

module.exports = {
  getYTMusic,
  searchSongs,
  searchArtists,
  searchAlbums,
  searchByType,
  resolveVideoId,
  getAlbum,
  getArtist,
  getArtistAlbums,
  getSearchSuggestions,
  getPlaylistTracks,
  getChartsLive,
  getTrendingLive,
  getGenreSample,
};
