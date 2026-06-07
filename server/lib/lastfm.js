const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/';

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const DEFAULT_TIMEOUT_MS = toPositiveInt(process.env.LASTFM_TIMEOUT_MS, 12_000);
const RETRY_COUNT = toPositiveInt(process.env.LASTFM_RETRY_COUNT, 1);
const CHART_TTL_MS = toPositiveInt(process.env.LASTFM_CACHE_CHARTS_MS, 5 * 60 * 1000);
const INFO_TTL_MS = toPositiveInt(process.env.LASTFM_CACHE_INFO_MS, 30 * 60 * 1000);
const TAG_TTL_MS = toPositiveInt(process.env.LASTFM_CACHE_TAGS_MS, 6 * 60 * 60 * 1000);
const CACHE_MAX_ENTRIES = toPositiveInt(process.env.LASTFM_CACHE_MAX_ENTRIES, 4000);

const cache = new Map();
const inflight = new Map();

const requireApiKey = () => {
  const key = String(process.env.LASTFM_API_KEY || '').trim();
  if (!key) {
    throw new Error('LASTFM_API_KEY is not configured');
  }
  return key;
};

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

const cacheKeyFor = (method, params = {}) => {
  const stable = Object.keys(params)
    .sort()
    .map((key) => `${key}:${String(params[key])}`)
    .join('|');
  return `${method}|${stable}`;
};

const memo = async (key, ttlMs, producer) => {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    setRecent(key, hit.value, ttlMs);
    return hit.value;
  }
  if (inflight.has(key)) return inflight.get(key);

  const run = Promise.resolve()
    .then(producer)
    .then((value) => {
      setRecent(key, value, ttlMs);
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, run);
  return run;
};

const isRetryableStatus = (status) => status === 429 || status >= 500;

const callLastFmNetwork = async (method, params = {}, retries = RETRY_COUNT) => {
  const apiKey = requireApiKey();
  const qs = new URLSearchParams({
    method,
    api_key: apiKey,
    format: 'json',
    ...params,
  });
  const url = `${LASTFM_BASE}?${qs.toString()}`;

  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await withTimeout(url);
      if (!res.ok) {
        if (attempt < retries && isRetryableStatus(res.status)) {
          continue;
        }
        throw new Error(`Last.fm ${method} failed (${res.status})`);
      }
      const data = await res.json();
      if (data?.error) {
        throw new Error(`Last.fm ${method} error: ${data.message || data.error}`);
      }
      return data;
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
    }
  }
  throw lastError || new Error(`Last.fm ${method} failed`);
};

const callLastFm = async (method, params = {}, { cacheTtlMs = 0 } = {}) => {
  const run = () => callLastFmNetwork(method, params);
  if (!cacheTtlMs) return run();
  return memo(cacheKeyFor(method, params), cacheTtlMs, run);
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const getTopTracks = async (limit = 50) => {
  const data = await callLastFm(
    'chart.gettoptracks',
    { limit: String(limit), page: '1' },
    { cacheTtlMs: CHART_TTL_MS },
  );
  return asArray(data?.tracks?.track);
};

const getTopTracksByCountry = async (country, limit = 50) => {
  const data = await callLastFm(
    'geo.gettoptracks',
    {
      country: String(country || ''),
      limit: String(limit),
      page: '1',
    },
    { cacheTtlMs: CHART_TTL_MS },
  );
  return asArray(data?.tracks?.track);
};

const getTopArtists = async (limit = 50) => {
  const data = await callLastFm(
    'chart.gettopartists',
    { limit: String(limit), page: '1' },
    { cacheTtlMs: CHART_TTL_MS },
  );
  return asArray(data?.artists?.artist);
};

const getTopArtistsByCountry = async (country, limit = 50) => {
  const data = await callLastFm(
    'geo.gettopartists',
    {
      country: String(country || ''),
      limit: String(limit),
      page: '1',
    },
    { cacheTtlMs: CHART_TTL_MS },
  );
  return asArray(data?.topartists?.artist);
};

const getTrackInfo = async (artist, track) => {
  const data = await callLastFm(
    'track.getinfo',
    {
      artist: String(artist || ''),
      track: String(track || ''),
      autocorrect: '1',
    },
    { cacheTtlMs: INFO_TTL_MS },
  );
  return data?.track || null;
};

const getArtistInfo = async (artist) => {
  const data = await callLastFm(
    'artist.getinfo',
    {
      artist: String(artist || ''),
      autocorrect: '1',
    },
    { cacheTtlMs: INFO_TTL_MS },
  );
  return data?.artist || null;
};

// Top tags ("genres") for a track. We call this opportunistically because
// `track.getInfo` already includes `toptags`, but a dedicated call is more
// reliable when the track entry lacks an mbid.
const getTrackTopTags = async (artist, track) => {
  try {
    const data = await callLastFm(
      'track.gettoptags',
      {
        artist: String(artist || ''),
        track: String(track || ''),
        autocorrect: '1',
      },
      { cacheTtlMs: TAG_TTL_MS },
    );
    const list = asArray(data?.toptags?.tag);
    return list.map((tag) => String(tag?.name || '').trim()).filter(Boolean);
  } catch {
    return [];
  }
};

// Top tags for an artist. Returned tag list is roughly sorted by count.
const getArtistTopTags = async (artist) => {
  try {
    const data = await callLastFm(
      'artist.gettoptags',
      {
        artist: String(artist || ''),
        autocorrect: '1',
      },
      { cacheTtlMs: TAG_TTL_MS },
    );
    const list = asArray(data?.toptags?.tag);
    return list.map((tag) => String(tag?.name || '').trim()).filter(Boolean);
  } catch {
    return [];
  }
};

// Top tracks for a specific artist, all-time. Used as a fallback for
// "Top song" on the artists chart when no track in the *current* chart
// happens to be credited to that artist (common for composers / producers).
const getArtistTopTracks = async (artist, limit = 5) => {
  try {
    const data = await callLastFm(
      'artist.gettoptracks',
      {
        artist: String(artist || ''),
        autocorrect: '1',
        limit: String(limit),
        page: '1',
      },
      { cacheTtlMs: INFO_TTL_MS },
    );
    return asArray(data?.toptracks?.track);
  } catch {
    return [];
  }
};

const getSimilarTracks = async (artist, track, limit = 20) => {
  try {
    const data = await callLastFm(
      'track.getsimilar',
      {
        artist: String(artist || ''),
        track: String(track || ''),
        autocorrect: '1',
        limit: String(limit),
      },
      { cacheTtlMs: INFO_TTL_MS },
    );
    const rows = asArray(data?.similartracks?.track);
    return rows.map((row) => ({
      name: String(row?.name || '').trim(),
      artist: String(row?.artist?.name || '').trim(),
      match: Number.parseFloat(String(row?.match || '0')) || 0,
    })).filter((row) => row.name && row.artist);
  } catch {
    return [];
  }
};

module.exports = {
  getTopTracks,
  getTopTracksByCountry,
  getTopArtists,
  getTopArtistsByCountry,
  getTrackInfo,
  getArtistInfo,
  getTrackTopTags,
  getArtistTopTags,
  getArtistTopTracks,
  getSimilarTracks,
};
