const catalog = require('../clients/catalog.client');
const ytm = require('../clients/ytmusic.client');
const { toTrackDTO } = require('../clients/mappers.client');
const { liveOrFallback, dedupeById } = require('../utils/http');

const getTrendingPayload = async ({ limit }) => {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));

  const live = async () => {
    const rows = await ytm.getTrendingLive(safeLimit);
    const items = dedupeById(rows.map((row) => toTrackDTO(row)).filter(Boolean)).slice(0, safeLimit);
    if (items.length === 0) throw new Error('no live trending');
    return items;
  };

  return liveOrFallback(
    live,
    () => catalog.getTrending(safeLimit),
    'trending',
  );
};

module.exports = {
  getTrendingPayload,
};
