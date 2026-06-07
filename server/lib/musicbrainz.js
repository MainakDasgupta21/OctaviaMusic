const MUSICBRAINZ_BASE = 'https://musicbrainz.org/ws/2';

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const DEFAULT_TIMEOUT_MS = toPositiveInt(process.env.MUSICBRAINZ_TIMEOUT_MS, 10_000);
const CACHE_TTL_MS = toPositiveInt(process.env.MUSICBRAINZ_CACHE_TTL_MS, 24 * 60 * 60 * 1000);
const CACHE_MAX_ENTRIES = toPositiveInt(process.env.MUSICBRAINZ_CACHE_MAX_ENTRIES, 6000);
// MusicBrainz usage policy asks for around 1 request/sec per client.
const MIN_INTERVAL_MS = toPositiveInt(process.env.MUSICBRAINZ_MIN_INTERVAL_MS, 1000);

const cache = new Map();
const inflight = new Map();
let nextAllowedAt = 0;

const withTimeout = async (url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
};

const wait = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const throttleMusicBrainz = async () => {
  const now = Date.now();
  const waitMs = Math.max(0, nextAllowedAt - now);
  nextAllowedAt = Math.max(now, nextAllowedAt) + MIN_INTERVAL_MS;
  if (waitMs > 0) {
    await wait(waitMs);
  }
};

const trimOldest = () => {
  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey === undefined) break;
    cache.delete(oldestKey);
  }
};

const setRecent = (key, value, ttlMs) => {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
  trimOldest();
};

const memo = async (key, producer) => {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    setRecent(key, hit.value, CACHE_TTL_MS);
    return hit.value;
  }
  if (inflight.has(key)) return inflight.get(key);

  const run = Promise.resolve()
    .then(producer)
    .then((value) => {
      setRecent(key, value, CACHE_TTL_MS);
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, run);
  return run;
};

const callMusicBrainz = async (path, query) => {
  await throttleMusicBrainz();
  const qs = new URLSearchParams({ ...query, fmt: 'json' });
  const url = `${MUSICBRAINZ_BASE}${path}?${qs.toString()}`;
  const res = await withTimeout(url, {
    headers: {
      'User-Agent': 'octavia-music/1.0 (charts integration)',
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`MusicBrainz ${path} failed (${res.status})`);
  }
  return res.json();
};

// Direct MBID lookup — unambiguous and fastest path. Last.fm provides
// `mbid` on most chart entries, so we should always try this first.
const getArtistCountryByMbid = async (mbid) => {
  const trimmed = String(mbid || '').trim();
  if (!trimmed) return null;
  return memo(`artist-country-mbid:${trimmed}`, async () => {
    try {
      const data = await callMusicBrainz(`/artist/${encodeURIComponent(trimmed)}`, {});
      return data?.country || null;
    } catch {
      return null;
    }
  });
};

// Name-based search. We pull the top 5 hits and pick the one with the
// highest score; "Drake" alone returns dozens of unrelated artists, so the
// `artist:"name"` quoted filter biases toward exact-name matches and the
// score sort lets us prefer the most popular interpretation.
const getArtistCountryByName = async (artistName) => {
  const name = String(artistName || '').trim();
  if (!name) return null;
  return memo(`artist-country-name:${name.toLowerCase()}`, async () => {
    try {
      const data = await callMusicBrainz('/artist', {
        query: `artist:"${name}"`,
        limit: '5',
      });
      const list = Array.isArray(data?.artists) ? data.artists : [];
      if (list.length === 0) return null;
      // MusicBrainz returns `score` 0-100. Sort desc + tiebreak by entries
      // with a populated country so we never pick a higher-score row that
      // happens to lack the country field.
      const ranked = [...list].sort((a, b) => {
        const scoreDiff = (Number(b?.score) || 0) - (Number(a?.score) || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return Boolean(b?.country) - Boolean(a?.country);
      });
      const withCountry = ranked.find((entry) => entry?.country);
      return withCountry?.country || ranked[0]?.country || null;
    } catch {
      return null;
    }
  });
};

// Public API. Tries MBID first (when caller supplied one) and falls back to
// a name search. Either path can return null — the spec accepts that.
const getArtistCountry = async (artistName, options = {}) => {
  const { mbid } = options;
  if (mbid) {
    const fromMbid = await getArtistCountryByMbid(mbid);
    if (fromMbid) return fromMbid;
  }
  return getArtistCountryByName(artistName);
};

const getRecordingFirstReleaseDate = async (title, artist) =>
  memo(
    `recording-date:${String(title || '').toLowerCase().trim()}|${String(artist || '').toLowerCase().trim()}`,
    async () => {
      if (!title || !artist) return null;
      try {
        const query = `${title} AND artist:${artist}`;
        const data = await callMusicBrainz('/recording', { query, limit: '1' });
        const recording = Array.isArray(data?.recordings) ? data.recordings[0] : null;
        return recording?.['first-release-date'] || null;
      } catch {
        return null;
      }
    },
  );

module.exports = {
  getArtistCountry,
  getRecordingFirstReleaseDate,
};
