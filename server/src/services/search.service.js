const catalog = require('../clients/catalog.client');
const ytm = require('../clients/ytmusic.client');
const {
  toTrackDTO,
  toAlbumSummaryDTO,
  toArtistSummaryDTO,
} = require('../clients/mappers.client');
const { liveOrFallback, dedupeById, clampInt } = require('../utils/http');

const DEFAULT_SEARCH_LIMIT = 30;
const MAX_SEARCH_LIMIT = 60;
const SEARCH_TYPES = new Set(['all', 'song', 'artist', 'album', 'playlist']);

const normalizeSearchType = (rawType) => {
  const safeType = String(rawType || 'all');
  return SEARCH_TYPES.has(safeType) ? safeType : 'all';
};

const getSearchPayload = async ({ q, type, limit }) => {
  const safeType = normalizeSearchType(type);
  const safeLimit = clampInt(limit, {
    min: 1,
    max: MAX_SEARCH_LIMIT,
    fallback: DEFAULT_SEARCH_LIMIT,
  });
  const query = String(q || '').trim();

  if (safeType === 'playlist') return [];
  if (!query) return [];

  const allCaps = (() => {
    const songs = Math.max(15, Math.min(40, Math.round(safeLimit * 0.6)));
    const artists = Math.max(8, Math.min(20, Math.round(safeLimit * 0.25)));
    const albums = Math.max(8, Math.min(20, Math.round(safeLimit * 0.25)));
    return { songs, artists, albums };
  })();

  const live = async () => {
    if (safeType === 'song') {
      const data = await ytm.searchByType(query, safeType, safeLimit);
      return dedupeById(data.map((s) => toTrackDTO(s)).filter(Boolean));
    }
    if (safeType === 'artist') {
      const data = await ytm.searchByType(query, safeType, safeLimit);
      return dedupeById(data.map(toArtistSummaryDTO).filter(Boolean));
    }
    if (safeType === 'album') {
      const data = await ytm.searchByType(query, safeType, safeLimit);
      return dedupeById(data.map(toAlbumSummaryDTO).filter(Boolean));
    }

    const data = await ytm.searchByType(query, safeType, undefined, { limits: allCaps });
    const songs = (data.songs || []).map((s) => toTrackDTO(s)).filter(Boolean);
    const artists = (data.artists || []).map(toArtistSummaryDTO).filter(Boolean);
    const albums = (data.albums || []).map(toAlbumSummaryDTO).filter(Boolean);
    return dedupeById([...songs, ...artists, ...albums]);
  };

  const fallback = () => catalog.search(query, safeType);
  return liveOrFallback(live, fallback, `search(${safeType}, ${query})`);
};

const getSearchSuggestions = async ({ q }) => {
  const query = String(q || '').trim();
  if (!query) return [];
  return liveOrFallback(
    () => ytm.getSearchSuggestions(query),
    () => [],
    `searchSuggestions(${query})`,
    { treatEmptyAsFailure: false },
  );
};

module.exports = {
  getSearchPayload,
  getSearchSuggestions,
};
