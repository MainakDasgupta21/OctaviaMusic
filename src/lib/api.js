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
  let parsed = null;
  try {
    parsed = new URL(url, 'http://localhost');
  } catch {
    return url;
  }

  const host = String(parsed.hostname || '').toLowerCase();
  const isYouTubeThumbHost =
    host.includes('ytimg.com') || host.includes('youtube.com');
  const isGoogleAvatarHost =
    host.includes('yt3.ggpht.com') || host.includes('googleusercontent.com');

  // Artist/avatar hosts are especially sensitive to arbitrary size rewrites and
  // can start returning 429/403; keep their original params untouched.
  if (isGoogleAvatarHost && !isYouTubeThumbHost) {
    return url;
  }

  if (!isYouTubeThumbHost) {
    return url;
  }

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

export const searchMusic = async (query, type = 'all', { limit, signal } = {}) => {
  const params = { q: query, type };
  if (Number.isFinite(limit) && limit > 0) {
    // Backend clamps to 1..60; let it pick the default when not supplied so
    // smaller surfaces (TopBar) don't ask for more rows than they can render.
    params.limit = Math.round(limit);
  }
  const response = await api.get('/search', { params, signal });
  return upgradeAllImages(response.data);
};

// Real YTM autocomplete suggestions. Best-effort: any failure resolves to
// `[]` so the input never becomes blocked (suggestions are an enhancement,
// not a requirement). The backend already swallows upstream errors, but we
// belt-and-braces here for network/CORS issues.
export const getSearchSuggestions = async (query, { signal } = {}) => {
  const q = String(query || '').trim();
  if (!q) return [];
  try {
    const response = await api.get('/search/suggestions', { params: { q }, signal });
    const list = Array.isArray(response.data?.suggestions) ? response.data.suggestions : [];
    return list
      .map((s) => (typeof s === 'string' ? s.trim() : ''))
      .filter(Boolean);
  } catch {
    return [];
  }
};

export const getAlbum = async (id, { signal } = {}) => {
  const response = await api.get(`/album/${encodeURIComponent(id)}`, { signal });
  return upgradeAllImages(response.data);
};

export const getArtist = async (slugOrId, { signal } = {}) => {
  const response = await api.get(`/artist/${encodeURIComponent(slugOrId)}`, { signal });
  return upgradeAllImages(response.data);
};

export const getCharts = async ({
  region = 'global',
  window: chartWindow = 'this_week',
  limit = 50,
  signal,
} = {}) => {
  const response = await api.get('/charts', {
    params: { region, window: chartWindow, limit },
    signal,
  });
  return upgradeAllImages(response.data);
};

// Artist-level chart, derived server-side from the same source the songs
// chart uses. Returns `{ items, meta }` shaped like /charts; each item is a
// ranked artist (`{ id, slug, humanSlug, name, thumbnail, tracks, plays, rank }`).
export const getChartsArtists = async ({
  region = 'global',
  window: chartWindow = 'this_week',
  limit = 50,
  signal,
} = {}) => {
  const response = await api.get('/charts/artists', {
    params: { region, window: chartWindow, limit },
    signal,
  });
  return upgradeAllImages(response.data);
};

export const getTrending = async ({ limit = 20, signal } = {}) => {
  const response = await api.get('/trending', { params: { limit }, signal });
  return upgradeAllImages(response.data);
};

export const getHomeFeatured = async ({ signal } = {}) => {
  const response = await api.get('/home/featured', { signal });
  return upgradeAllImages(response.data);
};

export const getHomeFeed = async ({ limit = 20, signal } = {}) => {
  const composeLegacyHomeFeed = async () => {
    const [featured, trending] = await Promise.all([
      getHomeFeatured({ signal }),
      getTrending({ limit, signal }),
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
    const response = await api.get('/home', { params: { limit }, signal });
    return upgradeAllImages(response.data);
  } catch (error) {
    if (error?.response?.status === 404) {
      return composeLegacyHomeFeed();
    }
    throw error;
  }
};

export const getGenres = async ({ signal } = {}) => {
  const response = await api.get('/genres', { signal });
  return upgradeAllImages(response.data);
};

export const getExplorePulse = async ({ region = 'global', signal } = {}) => {
  const response = await api.get('/explore/pulse', {
    params: { region },
    signal,
  });
  return upgradeAllImages(response.data);
};

export const getExploreRadio = async ({
  mood = '',
  genre = '',
  seed = '',
  diversity = '',
  limit = 24,
  signal,
} = {}) => {
  const response = await api.get('/explore/radio', {
    params: {
      mood,
      genre,
      seed,
      limit,
      ...(diversity ? { diversity } : {}),
    },
    signal,
  });
  return upgradeAllImages(response.data);
};

export const getExploreSimilar = async ({ trackId = '', limit = 12, signal } = {}) => {
  const response = await api.get('/explore/similar', {
    params: { trackId, limit },
    signal,
  });
  return upgradeAllImages(response.data);
};

export const getExploreJourney = async (journeyId, { signal } = {}) => {
  const response = await api.get(`/explore/journeys/${encodeURIComponent(journeyId)}`, { signal });
  return upgradeAllImages(response.data);
};

// Lyrics live behind the same backend (proxied via LRCLib). React Query
// distinguishes a 404 (no lyrics for this song) from a 5xx (provider down) so
// the UI can decide between "not available" and "retry".
export const getLyrics = async ({ title, artist, durationSec, videoId } = {}) => {
  const hasTitleArtist = Boolean(title && artist);
  const hasVideoId = Boolean(videoId && String(videoId).trim());
  if (!hasTitleArtist && !hasVideoId) return null;

  const params = {};
  if (hasTitleArtist) {
    params.title = title;
    params.artist = artist;
  }
  if (hasVideoId) {
    params.videoId = String(videoId).trim();
  }
  if (Number.isFinite(durationSec) && durationSec > 0) {
    params.duration = Math.round(durationSec);
  }
  const response = await api.get('/lyrics', { params });
  const data = response.data || {};
  return {
    syncedRaw: data.syncedLyrics || '',
    plain: data.plainLyrics || '',
    // Surface the upstream "instrumental" flag (when present) so the UI can
    // render a dedicated empty state instead of the generic "no lyrics".
    instrumental: Boolean(data.instrumental),
  };
};

// Server health probe — used by the TopBar to surface an offline banner
// when the catalog backend is unreachable.
export const getServerHealth = async () => {
  // Short timeout so a hung backend doesn't hold the UI hostage. We also
  // fail fast on non-2xx so the caller treats it as offline.
  const response = await api.get('/health', { timeout: 4000 });
  return response?.data || { status: 'ok' };
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
