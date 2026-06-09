const catalog = require('../clients/catalog.client');
const ytm = require('../clients/ytmusic.client');
const { toTrackDTO } = require('../clients/mappers.client');
const { liveOrFallback, dedupeById } = require('../utils/http');

const HOME_EYEBROWS = ['Featured today', 'New release', 'On repeat'];
const HOME_TITLES = [
  'The track everyone is on',
  'Fresh on the rotation',
  'A familiar favourite',
];
const HOME_DESCRIPTIONS = [
  "The number-one record right now - a single tap and you're in.",
  "Hand-picked from this week's newest drops.",
  'Pulled from the global chart, sized for a slow afternoon.',
];

const toHomeFeature = (track, index) => ({
  id: `feat-${track.id}`,
  eyebrow: HOME_EYEBROWS[index % HOME_EYEBROWS.length],
  title: HOME_TITLES[index % HOME_TITLES.length],
  description: HOME_DESCRIPTIONS[index % HOME_DESCRIPTIONS.length],
  cover: track.thumbnail,
  track,
  to: track.albumId
    ? `/album/${track.albumId}`
    : track.artistSlug
      ? `/artist/${track.artistSlug}`
      : '/player',
});

const getHomePayloadLive = async (limit = 20) => {
  const [chartsRows, trendingRows] = await Promise.all([
    ytm.getChartsLive(Math.max(limit, 6)).catch(() => []),
    ytm.getTrendingLive(limit).catch(() => []),
  ]);
  const charts = dedupeById(chartsRows.map((row) => toTrackDTO(row)).filter(Boolean)).slice(0, limit);
  const trending = dedupeById(trendingRows.map((row) => toTrackDTO(row)).filter(Boolean)).slice(0, limit);

  if (charts.length === 0 && trending.length === 0) throw new Error('no live tracks');

  return {
    featured: charts.slice(0, 3).map(toHomeFeature),
    trending: trending.length > 0 ? trending : charts,
    meta: { source: 'live', generatedAt: new Date().toISOString() },
  };
};

const getHomePayloadFallback = (limit = 20) => ({
  featured: catalog.getHomeFeatured(),
  trending: catalog.getTrending(limit),
  meta: { source: 'fallback', generatedAt: new Date().toISOString() },
});

const getHomePayload = (limit, label = `home(${limit})`) =>
  liveOrFallback(
    () => getHomePayloadLive(limit),
    () => getHomePayloadFallback(limit),
    label,
  );

const getHomeFeaturedLive = async () => {
  const chartsRows = await ytm.getChartsLive(6).catch(() => []);
  const charts = dedupeById(chartsRows.map((row) => toTrackDTO(row)).filter(Boolean));
  if (charts.length === 0) throw new Error('no live tracks');
  return charts.slice(0, 3).map(toHomeFeature);
};

const getHomeFeaturedPayload = () =>
  liveOrFallback(
    getHomeFeaturedLive,
    () => catalog.getHomeFeatured(),
    'home/featured',
  );

module.exports = {
  getHomePayload,
  getHomeFeaturedPayload,
};
