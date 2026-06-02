import axios from 'axios';

// Resolved from the build-time env: set VITE_API_BASE in `.env` or `.env.local`.
// Falls back to a local Express server during dev.
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) ||
  'http://localhost:5000/api';

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
    .replace(/\/hqdefault\.jpg/, '/maxresdefault.jpg')
    .replace(/\/mqdefault\.jpg/, '/maxresdefault.jpg')
    .replace(/\/sddefault\.jpg/, '/maxresdefault.jpg');
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

export const searchMusic = async (query, type = 'all') => {
  const response = await api.get('/search', { params: { q: query, type } });
  return upgradeAllImages(response.data);
};

export const getAlbum = async (id) => {
  const response = await api.get(`/album/${encodeURIComponent(id)}`);
  return upgradeAllImages(response.data);
};

export const getArtist = async (slugOrId) => {
  const response = await api.get(`/artist/${encodeURIComponent(slugOrId)}`);
  return upgradeAllImages(response.data);
};

export const getCharts = async ({ limit = 50 } = {}) => {
  const response = await api.get('/charts', { params: { limit } });
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

export const getGenres = async () => {
  const response = await api.get('/genres');
  return upgradeAllImages(response.data);
};

// Translates an axios error into a "not found" sentinel so pages can render
// EmptyState without try/catching every call site.
export const isNotFoundError = (error) =>
  Boolean(error?.response && error.response.status === 404);

export default api;
