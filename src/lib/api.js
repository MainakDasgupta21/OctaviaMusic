import axios from 'axios';

// Resolved from the build-time env: set VITE_API_BASE in `.env` or `.env.local`.
// Falls back to localhost in dev and same-origin `/api` in production.
export const readApiBase = () => {
  if (typeof import.meta === 'undefined') return 'http://localhost:5000/api';
  const configured = import.meta.env?.VITE_API_BASE?.trim();
  if (configured) return configured;
  if (import.meta.env?.DEV) return 'http://localhost:5000/api';

  // Production default keeps frontend/backend deployable behind one domain.
  return '/api';
};

const API_BASE = readApiBase();

if (typeof import.meta !== 'undefined' && !import.meta.env?.DEV && !import.meta.env?.VITE_API_BASE) {
  console.warn('[api] VITE_API_BASE is not set, defaulting to same-origin /api');
}

const api = axios.create({
  baseURL: API_BASE,
  // The backend talks to YouTube Music live; a cold cache (first hit after the
  // server starts, or after a TTL expiry) can take a few seconds, especially
  // when several queries fire on initial page load. 10s was too tight and led
  // to spurious failures that only cleared on refresh — give it real headroom.
  timeout: 25000,
});

// =============================================================================
// Image helpers — YouTube thumbnails ship at varying resolutions. We rewrite
// the URL once and then recurse so nested `tracks[]`/`albums[]` benefit too.
// =============================================================================

export const upgradeImageQuality = (url) => {
  if (!url || typeof url !== 'string') return url;
  return url
    .replace(/=w\d+-h\d+/, '=w544-h544')
    .replace(/=s\d+/, '=s544')
    // maxresdefault is frequently missing on ytimg; prefer stable hqdefault.
    .replace(/\/maxresdefault\.jpg/, '/hqdefault.jpg')
    .replace(/\/mqdefault\.jpg/, '/hqdefault.jpg')
    .replace(/\/sddefault\.jpg/, '/hqdefault.jpg');
};

// Walks an arbitrary payload and rewrites any `thumbnail` / `cover` field.
const upgradeAllImages = (value) => {
  if (Array.isArray(value)) return value.map(upgradeAllImages);
  if (value && typeof value === 'object') {
    const next = { ...value };
    for (const key of Object.keys(next)) {
      if ((key === 'thumbnail' || key === 'cover') && typeof next[key] === 'string') {
        next[key] = upgradeImageQuality(next[key]);
      } else {
        next[key] = upgradeAllImages(next[key]);
      }
    }
    return next;
  }
  return value;
};

// =============================================================================
// Endpoints. None of these swallow errors anymore — callers (React Query) get
// the real failure and render an error state.
// =============================================================================

export const searchMusic = async (query, type = 'all', { limit } = {}) => {
  const params = { q: query, type };
  if (Number.isFinite(limit) && limit > 0) {
    // Backend clamps to 1..60; let it pick the default when not supplied so
    // smaller surfaces (TopBar) don't ask for more rows than they can render.
    params.limit = Math.round(limit);
  }
  const response = await api.get('/search', { params });
  return upgradeAllImages(response.data);
};

// Real YTM autocomplete suggestions. Best-effort: any failure resolves to
// `[]` so the input never becomes blocked (suggestions are an enhancement,
// not a requirement). The backend already swallows upstream errors, but we
// belt-and-braces here for network/CORS issues.
export const getSearchSuggestions = async (query) => {
  const q = String(query || '').trim();
  if (!q) return [];
  try {
    const response = await api.get('/search/suggestions', { params: { q } });
    const list = Array.isArray(response.data?.suggestions) ? response.data.suggestions : [];
    return list
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter(Boolean);
  } catch {
    return [];
  }
};

export const getAlbum = async (id) => {
  const response = await api.get(`/album/${encodeURIComponent(id)}`);
  return upgradeAllImages(response.data);
};

export const getArtist = async (slugOrId) => {
  const response = await api.get(`/artist/${encodeURIComponent(slugOrId)}`);
  return upgradeAllImages(response.data);
};

// `region`/`window` are accepted today as pass-through query params so the
// React Query key stays stable across selections; the backend currently
// ignores them but will use them once it supports regional charts.
export const getCharts = async ({
  region = 'global',
  window: chartWindow = 'weekly',
  limit = 50,
} = {}) => {
  const response = await api.get('/charts', {
    params: { region, window: chartWindow, limit },
  });
  return upgradeAllImages(response.data);
};

export const getTrending = async ({ limit = 20 } = {}) => {
  const response = await api.get('/trending', { params: { limit } });
  return upgradeAllImages(response.data);
};

export const getHomeFeatured = async () => {
  const response = await api.get('/home/featured');
  return upgradeAllImages(response.data);
};

export const getHomeFeed = async ({ limit = 20 } = {}) => {
  const composeLegacyHomeFeed = async () => {
    const [featured, trending] = await Promise.all([
      getHomeFeatured(),
      getTrending({ limit }),
    ]);
    return upgradeAllImages({
      featured,
      trending,
      meta: { source: 'legacy-composed' },
    });
  };

  // Always try the unified `/home` endpoint first. In dev, fall back to the
  // legacy `/featured` + `/trending` compose only when the new route 404s
  // (e.g. an outdated backend hasn't been restarted yet).
  try {
    const response = await api.get('/home', { params: { limit } });
    return upgradeAllImages(response.data);
  } catch (error) {
    if (error?.response?.status === 404) {
      return composeLegacyHomeFeed();
    }
    throw error;
  }
};

export const getGenres = async () => {
  const response = await api.get('/genres');
  return upgradeAllImages(response.data);
};

// Lyrics live behind the same backend (proxied via LRCLib). React Query
// distinguishes a 404 (no lyrics for this song) from a 5xx (provider down) so
// the UI can decide between "not available" and "retry".
export const getLyrics = async ({ title, artist, durationSec } = {}) => {
  if (!title || !artist) return null;
  const params = { title, artist };
  if (Number.isFinite(durationSec) && durationSec > 0) {
    params.duration = Math.round(durationSec);
  }
  const response = await api.get('/lyrics', { params });
  const data = response.data || {};
  return {
    syncedRaw: data.syncedLyrics || '',
    plain: data.plainLyrics || '',
  };
};

// Translates an axios error into a "not found" sentinel so pages can render
// EmptyState without try/catching every call site.
export const isNotFoundError = (error) =>
  Boolean(error?.response && error.response.status === 404);

export const isProviderError = (error) =>
  Boolean(error?.response && error.response.status >= 500);

export const isNetworkError = (error) =>
  Boolean(error?.code === 'ERR_NETWORK' || (error && !error.response));

export default api;
