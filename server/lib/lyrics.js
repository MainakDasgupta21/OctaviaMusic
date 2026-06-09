// =============================================================================
// LRCLib wrapper used by `/api/lyrics`.
// - Keeps browser CORS / UA quirks out of the client.
// - Tries strict lookup first, then relaxed search fallbacks.
// - Can derive title/artist from YouTube metadata when only a video id is known.
// - Caches hits + misses with in-flight de-dupe.
// =============================================================================

const num = (v, fallback) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const LRCLIB_BASE_URL = (process.env.LYRICS_BASE_URL || 'https://lrclib.net').replace(/\/+$/, '');
const YT_OEMBED_BASE_URL = (process.env.LYRICS_YT_OEMBED_BASE_URL || 'https://www.youtube.com/oembed').replace(/\/+$/, '');
const LYRICS_TIMEOUT_MS = num(process.env.LYRICS_TIMEOUT_MS, 8000);
const CACHE_HIT_MS = num(process.env.LYRICS_CACHE_MIN, 180) * 60000;
const CACHE_MISS_MS = num(process.env.LYRICS_CACHE_MISS_MIN, 5) * 60000;
const CLIENT_ID = process.env.LYRICS_CLIENT_ID || 'Octavia (https://octavia.local)';
const YT_VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

const cache = new Map(); // key -> { value, expires } | { inflight, expires: 0 }
const CACHE_MAX = num(process.env.LYRICS_CACHE_MAX_ENTRIES, 500);

const touch = (key, entry) => {
  // Re-insert so this becomes the most-recently used; combined with the size
  // cap below this is a tiny insertion-order LRU.
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

const memo = async (key, producer) => {
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
      const ttl = value ? CACHE_HIT_MS : CACHE_MISS_MS;
      const entry = { value, expires: Date.now() + ttl };
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

const normalizeToken = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const compact = (text) =>
  String(text || '')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeVideoId = (value) => {
  const raw = compact(value);
  if (!raw) return '';
  if (YT_VIDEO_ID_RE.test(raw)) return raw;
  try {
    const parsed = new URL(raw);
    if (parsed.hostname.endsWith('youtu.be')) {
      const id = parsed.pathname.split('/').filter(Boolean)[0] || '';
      return YT_VIDEO_ID_RE.test(id) ? id : '';
    }
    const watchId = parsed.searchParams.get('v') || '';
    if (YT_VIDEO_ID_RE.test(watchId)) return watchId;
    const tail = parsed.pathname.split('/').filter(Boolean).pop() || '';
    if (YT_VIDEO_ID_RE.test(tail)) return tail;
    return '';
  } catch {
    return '';
  }
};

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

const uniqueExpandedStrings = (rows, expand) =>
  uniqueStrings(
    rows.flatMap((row) => {
      const source = compact(row);
      if (!source) return [];
      return expand(source);
    }),
  );

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

const cleanYouTubeAuthor = (author) =>
  compact(author)
    .replace(/\s+-\s+topic$/i, '')
    .replace(/\s+vevo$/i, '')
    .trim();

const cleanYouTubeTitle = (title) =>
  compact(title)
    .replace(/\s+\|\s+.+$/, '')
    .replace(
      /\s*[[(](official(\s+music)?\s+video|official\s+audio|official\s+lyrics?|lyric\s+video|lyrics?|audio|video|visualizer|mv|hd|4k)[^)\]]*[)\]]\s*/gi,
      ' ',
    )
    .replace(/\s{2,}/g, ' ')
    .trim();

const splitArtistTitle = (text) => {
  const parts = compact(text)
    .split(/\s+[-–—]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length === 2 ? parts : null;
};

const buildYouTubeMetadataCandidates = ({ title, authorName }) => {
  const rawTitle = compact(title);
  const rawAuthor = compact(authorName);
  if (!rawTitle && !rawAuthor) {
    return { titleCandidates: [], artistCandidates: [] };
  }

  const cleanedTitle = cleanYouTubeTitle(rawTitle);
  const cleanedAuthor = cleanYouTubeAuthor(rawAuthor);

  const titleSeeds = uniqueStrings([cleanedTitle, rawTitle]);
  const artistSeeds = uniqueStrings([cleanedAuthor, rawAuthor]);

  const dashed = splitArtistTitle(cleanedTitle || rawTitle);
  if (dashed) {
    const [left, right] = dashed;
    titleSeeds.push(right, left);
    artistSeeds.push(left, right);
  }

  return {
    titleCandidates: uniqueExpandedStrings(titleSeeds, buildTitleCandidates),
    artistCandidates: uniqueExpandedStrings(artistSeeds, buildArtistCandidates),
  };
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

const requestYouTubeMetadata = async (videoId) => {
  const url = `${YT_OEMBED_BASE_URL}?${new URLSearchParams({
    url: `https://www.youtube.com/watch?v=${videoId}`,
    format: 'json',
  }).toString()}`;

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
      throw new Error(`YouTube oEmbed ${res.status} ${res.statusText}`);
    }
    const payload = await res.json();
    const title = compact(payload?.title);
    const authorName = compact(payload?.author_name);
    if (!title && !authorName) return null;
    return { title, authorName };
  } finally {
    clearTimeout(timer);
  }
};

const getYouTubeMetadata = (videoId) => memo(`ytmeta:${videoId}`, () => requestYouTubeMetadata(videoId));

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

// Fire every attempt in parallel; resolve with the first non-null hit, or
// null if every attempt settles empty/error. Provider glitches should degrade
// to "no lyrics" so the API returns 404 instead of noisy repeated 502s.
const raceFirstHit = async (attempts) => {
  let resolved = false;
  return new Promise((resolve) => {
    let pending = attempts.length;
    if (pending === 0) return resolve(null);
    for (const attempt of attempts) {
      Promise.resolve()
        .then(attempt)
        .then((value) => {
          if (resolved) return;
          if (value) {
            resolved = true;
            resolve(value);
            return;
          }
        })
        .catch(() => null)
        .finally(() => {
          pending -= 1;
          if (pending === 0 && !resolved) {
            resolved = true;
            resolve(null);
          }
        });
    }
  });
};

const lookupByCandidates = async ({ titleCandidates, artistCandidates, duration }) => {
  if (!titleCandidates.length || !artistCandidates.length) return null;
  const primaryTitle = titleCandidates[0];
  const primaryArtist = artistCandidates[0];

  // Phase 1: race every strict /api/get variant in parallel. First non-
  // null wins; if every variant 404s we fall through to /api/search.
  const getAttempts = [];
  if (duration) {
    getAttempts.push(() =>
      tryGet({ track_name: primaryTitle, artist_name: primaryArtist, duration }),
    );
  }
  getAttempts.push(() => tryGet({ track_name: primaryTitle, artist_name: primaryArtist }));
  for (const candidate of titleCandidates.slice(1, 3)) {
    getAttempts.push(() => tryGet({ track_name: candidate, artist_name: primaryArtist }));
  }

  const strictHit = await raceFirstHit(getAttempts);
  if (strictHit) return strictHit;

  // Phase 2: race the relaxed /api/search variants in parallel. Same idea.
  const searchAttempts = [];
  for (const candidate of titleCandidates.slice(0, 3)) {
    searchAttempts.push(() =>
      trySearch(
        { track_name: candidate, artist_name: primaryArtist },
        candidate,
        primaryArtist,
      ),
    );
  }
  searchAttempts.push(() =>
    trySearch(
      { q: `${primaryTitle} ${primaryArtist}`.trim() },
      primaryTitle,
      primaryArtist,
    ),
  );
  if (artistCandidates[1] && artistCandidates[1] !== primaryArtist) {
    searchAttempts.push(() =>
      trySearch(
        { track_name: primaryTitle, artist_name: artistCandidates[1] },
        primaryTitle,
        artistCandidates[1],
      ),
    );
  }

  return raceFirstHit(searchAttempts);
};

const getLyrics = async ({ title, artist, durationSec, videoId }) => {
  const titleCandidates = buildTitleCandidates(title);
  const artistCandidates = buildArtistCandidates(artist);
  const normalizedVideoId = normalizeVideoId(videoId);
  if (!titleCandidates.length && !artistCandidates.length && !normalizedVideoId) return null;

  const keyParts = [];
  if (titleCandidates.length) keyParts.push(`t:${normalizeToken(titleCandidates[0])}`);
  if (artistCandidates.length) keyParts.push(`a:${normalizeToken(artistCandidates[0])}`);
  if (normalizedVideoId) keyParts.push(`v:${normalizedVideoId}`);
  if (!keyParts.length) return null;

  const key = keyParts.join('|');
  const duration = roundedDuration(durationSec);

  return memo(key, async () => {
    if (titleCandidates.length && artistCandidates.length) {
      const directHit = await lookupByCandidates({
        titleCandidates,
        artistCandidates,
        duration,
      });
      if (directHit) return directHit;
    }

    if (!normalizedVideoId) return null;
    let metadata = null;
    try {
      metadata = await getYouTubeMetadata(normalizedVideoId);
    } catch {
      // Metadata is only a fallback path; if oEmbed is flaky we should still
      // treat this as "lyrics not found" instead of hard-failing the request.
      return null;
    }
    if (!metadata) return null;

    const derived = buildYouTubeMetadataCandidates(metadata);
    if (!derived.titleCandidates.length || !derived.artistCandidates.length) return null;

    return lookupByCandidates({
      titleCandidates: derived.titleCandidates,
      artistCandidates: derived.artistCandidates,
      duration,
    });
  });
};

module.exports = {
  getLyrics,
};
