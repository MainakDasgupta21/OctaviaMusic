// =============================================================================
// LRCLib wrapper used by `/api/lyrics`.
// - Keeps browser CORS / UA quirks out of the client.
// - Tries strict lookup first, then relaxed search fallbacks.
// - Caches hits + misses with in-flight de-dupe.
// =============================================================================

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const LRCLIB_BASE_URL = (process.env.LYRICS_BASE_URL || 'https://lrclib.net').replace(/\/+$/, '');
const LYRICS_TIMEOUT_MS = num(process.env.LYRICS_TIMEOUT_MS, 8000);
const CACHE_HIT_MS = num(process.env.LYRICS_CACHE_MIN, 180) * 60_000;
const CACHE_MISS_MS = num(process.env.LYRICS_CACHE_MISS_MIN, 5) * 60_000;
const CLIENT_ID = process.env.LYRICS_CLIENT_ID || 'Octavia (https://octavia.local)';

const cache = new Map(); // key -> { value, expires } | { inflight, expires: 0 }

const memo = async (key, producer) => {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.value !== undefined && hit.expires > now) {
    return hit.value;
  }
  if (hit && hit.inflight) return hit.inflight;

  const inflight = (async () => {
    try {
      const value = await producer();
      const ttl = value ? CACHE_HIT_MS : CACHE_MISS_MS;
      cache.set(key, { value, expires: Date.now() + ttl });
      return value;
    } catch (err) {
      cache.delete(key);
      throw err;
    }
  })();

  cache.set(key, { inflight, expires: 0 });
  return inflight;
};

const normalizeToken = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const uniqueStrings = (rows) => {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const s = String(row || '').trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
};

const buildTitleCandidates = (title) => {
  const raw = String(title || '').trim();
  if (!raw) return [];

  const noBrackets = raw
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s*\[[^\]]*]\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const noFeat = noBrackets.replace(/\s+(feat\.?|ft\.?)\s+.+$/i, '').trim();
  const noTail = noFeat.replace(/\s+-\s+[^-]+$/, '').trim();

  return uniqueStrings([raw, noBrackets, noFeat, noTail]);
};

const buildArtistCandidates = (artist) => {
  const raw = String(artist || '').trim();
  if (!raw) return [];
  const primary = raw.split(/,|&| x | feat\.?| ft\.?/i)[0].trim();
  return uniqueStrings([raw, primary]);
};

const hasLyrics = (row) => {
  if (!row || typeof row !== 'object') return false;
  const plain = typeof row.plainLyrics === 'string' ? row.plainLyrics.trim() : '';
  const synced = typeof row.syncedLyrics === 'string' ? row.syncedLyrics.trim() : '';
  return Boolean(plain || synced);
};

const toPayload = (row) => ({
  id: row.id ?? null,
  trackName: row.trackName || null,
  artistName: row.artistName || null,
  duration: Number.isFinite(row.duration) ? row.duration : null,
  plainLyrics: row.plainLyrics || '',
  syncedLyrics: row.syncedLyrics || '',
  instrumental: Boolean(row.instrumental),
});

const requestJson = async (path, query) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query || {})) {
    if (value == null || value === '') continue;
    params.set(key, String(value));
  }

  const url = `${LRCLIB_BASE_URL}${path}?${params.toString()}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LYRICS_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': CLIENT_ID,
      },
      signal: controller.signal,
    });

    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`LRCLib ${res.status} ${res.statusText}`);
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
};

const tryGet = async (params) => {
  const row = await requestJson('/api/get', params);
  return hasLyrics(row) ? toPayload(row) : null;
};

const pickBestResult = (rows, title, artist) => {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const wantTitle = normalizeToken(title);
  const wantArtist = normalizeToken(artist);

  let best = null;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!hasLyrics(row)) continue;

    const gotTitle = normalizeToken(row.trackName);
    const gotArtist = normalizeToken(row.artistName);

    let score = 0;
    if (gotTitle && wantTitle) {
      if (gotTitle === wantTitle) score += 6;
      else if (gotTitle.includes(wantTitle) || wantTitle.includes(gotTitle)) score += 3;
    }
    if (gotArtist && wantArtist) {
      if (gotArtist === wantArtist) score += 6;
      else if (gotArtist.includes(wantArtist) || wantArtist.includes(gotArtist)) score += 3;
    }
    if (row.syncedLyrics) score += 1;
    score -= i * 0.01; // Keep provider ordering as tie-break.

    if (!best || score > best.score) {
      best = { score, row };
    }
  }

  return best ? toPayload(best.row) : null;
};

const trySearch = async (params, title, artist) => {
  const rows = await requestJson('/api/search', params);
  return pickBestResult(rows, title, artist);
};

const roundedDuration = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
};

const getLyrics = async ({ title, artist, durationSec }) => {
  const titleCandidates = buildTitleCandidates(title);
  const artistCandidates = buildArtistCandidates(artist);
  if (!titleCandidates.length || !artistCandidates.length) return null;

  const key = `${normalizeToken(titleCandidates[0])}|${normalizeToken(artistCandidates[0])}`;
  const duration = roundedDuration(durationSec);

  return memo(key, async () => {
    const primaryTitle = titleCandidates[0];
    const primaryArtist = artistCandidates[0];
    let providerError = null;

    // Strict endpoint first; best case is one fast hit.
    const getAttempts = [];
    if (duration) {
      getAttempts.push({
        track_name: primaryTitle,
        artist_name: primaryArtist,
        duration,
      });
    }
    getAttempts.push({
      track_name: primaryTitle,
      artist_name: primaryArtist,
    });
    for (const candidate of titleCandidates.slice(1, 3)) {
      getAttempts.push({ track_name: candidate, artist_name: primaryArtist });
    }

    for (const params of getAttempts) {
      try {
        const hit = await tryGet(params);
        if (hit) return hit;
      } catch (err) {
        providerError = providerError || err;
      }
    }

    // Relaxed search endpoint as fallback.
    for (const candidate of titleCandidates.slice(0, 3)) {
      try {
        const hit = await trySearch(
          { track_name: candidate, artist_name: primaryArtist },
          candidate,
          primaryArtist,
        );
        if (hit) return hit;
      } catch (err) {
        providerError = providerError || err;
      }
    }

    try {
      const qHit = await trySearch(
        { q: `${primaryTitle} ${primaryArtist}`.trim() },
        primaryTitle,
        primaryArtist,
      );
      if (qHit) return qHit;
    } catch (err) {
      providerError = providerError || err;
    }

    // Last chance: search with a simplified artist token when available.
    if (artistCandidates[1] && artistCandidates[1] !== primaryArtist) {
      try {
        const hit = await trySearch(
          { track_name: primaryTitle, artist_name: artistCandidates[1] },
          primaryTitle,
          artistCandidates[1],
        );
        if (hit) return hit;
      } catch (err) {
        providerError = providerError || err;
      }
    }

    if (providerError) {
      throw providerError;
    }

    return null;
  });
};

module.exports = {
  getLyrics,
};
