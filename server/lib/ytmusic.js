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
      await instance.initialize();
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
// -----------------------------------------------------------------------------
const cache = new Map(); // key -> { expires, value? , inflight? }

const memo = async (key, ttlMs, producer) => {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.value !== undefined && hit.expires > now) {
    return hit.value;
  }
  if (hit && hit.inflight) return hit.inflight;

  const inflight = (async () => {
    try {
      const value = await producer();
      cache.set(key, { value, expires: Date.now() + ttlMs });
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
// Single-retry helper. The upstream occasionally times out / returns 5xx; a
// quick retry usually clears it.
// -----------------------------------------------------------------------------
const withRetry = async (fn) => {
  try {
    return await fn();
  } catch (err) {
    return fn();
  }
};

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

const searchSongs = (q, limit = 30) =>
  memo(`search:vid:${q}`, TTL.search, async () => {
    const yt = await getYTMusic();
    const rows = await withRetry(() => yt.searchVideos(q));
    return Array.isArray(rows) ? rows.filter(isLikelySong).slice(0, limit) : [];
  });

const searchArtists = (q, limit = 20) =>
  memo(`search:artist:${q}`, TTL.search, async () => {
    const yt = await getYTMusic();
    const rows = await withRetry(() => yt.searchArtists(q));
    return Array.isArray(rows) ? rows.slice(0, limit) : [];
  });

const searchAlbums = (q, limit = 20) =>
  memo(`search:album:${q}`, TTL.search, async () => {
    const yt = await getYTMusic();
    const rows = await withRetry(() => yt.searchAlbums(q));
    return Array.isArray(rows) ? rows.slice(0, limit) : [];
  });

// Resolve a playable videoId for a (songName, artistName) pair by running a
// targeted `searchVideos` and picking the first hit. Heavily cached because
// album / artist details fan out into many of these in parallel.
const resolveVideoId = (songName, artistName) =>
  memo(`resolve:${artistName}|${songName}`, TTL.detail, async () => {
    const yt = await getYTMusic();
    const q = `${songName} ${artistName || ''}`.trim();
    const rows = await withRetry(() => yt.searchVideos(q));
    const hit = (rows || []).find((r) => r?.videoId);
    return hit || null;
  });

const searchByType = async (q, type, limit) => {
  switch (type) {
    case 'song':   return searchSongs(q, limit);
    case 'artist': return searchArtists(q, limit);
    case 'album':  return searchAlbums(q, limit);
    case 'all':
    default: {
      // Run all three in parallel — they each share the same cache so this is
      // cheap when the user toggles filters back to 'all'.
      const [songs, artists, albums] = await Promise.all([
        searchSongs(q, 15).catch(() => []),
        searchArtists(q, 8).catch(() => []),
        searchAlbums(q, 8).catch(() => []),
      ]);
      return { songs, artists, albums };
    }
  }
};

const getAlbum = (albumId) =>
  memo(`album:${albumId}`, TTL.detail, async () => {
    const yt = await getYTMusic();
    return withRetry(() => yt.getAlbum(albumId));
  });

const getArtist = (artistId) =>
  memo(`artist:${artistId}`, TTL.detail, async () => {
    const yt = await getYTMusic();
    return withRetry(() => yt.getArtist(artistId));
  });

const getPlaylistTracks = (playlistId) =>
  memo(`playlist:${playlistId}`, TTL.charts, async () => {
    const yt = await getYTMusic();
    const rows = await withRetry(() => yt.getPlaylistVideos(playlistId));
    return Array.isArray(rows) ? rows.filter(isLikelySong) : [];
  });

// -----------------------------------------------------------------------------
// Composite helpers for editorial / aggregate endpoints. These source from a
// playlist (single fast call, every row already playable) and only fall back
// to a broad video search if every playlist id fails.
// -----------------------------------------------------------------------------

// Try each playlist id in order; return the first that yields tracks.
const firstPlaylistWithTracks = async (ids, limit) => {
  for (const id of ids) {
    if (!id) continue;
    try {
      const rows = await getPlaylistTracks(id);
      if (rows.length) return rows.slice(0, limit);
    } catch {
      /* try the next id */
    }
  }
  return [];
};

const getChartsLive = (limit = 50) =>
  memo(`charts:${CHARTS_PLAYLIST || 'def'}:${limit}`, TTL.charts, async () => {
    const rows = await firstPlaylistWithTracks(
      [CHARTS_PLAYLIST, DEFAULT_CHARTS_PLAYLIST, DEFAULT_TRENDING_PLAYLIST],
      limit,
    );
    if (rows.length) return rows;
    // Last-resort live source: a single filtered video search (no fan-out).
    return searchSongs('top hits official music video', limit);
  });

const getTrendingLive = (limit = 20) =>
  memo(`trending:${TRENDING_PLAYLIST || 'def'}:${limit}`, TTL.charts, async () => {
    const rows = await firstPlaylistWithTracks(
      [TRENDING_PLAYLIST, DEFAULT_TRENDING_PLAYLIST, DEFAULT_CHARTS_PLAYLIST],
      limit,
    );
    if (rows.length) return rows;
    return searchSongs('new songs official music video', limit);
  });

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
  getPlaylistTracks,
  getChartsLive,
  getTrendingLive,
  getGenreSample,
};
