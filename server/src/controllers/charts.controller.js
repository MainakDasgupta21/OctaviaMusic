const { setCacheHeaders } = require('../utils/cache');
const { getChartsPayload, chartCacheSeconds } = require('../services/charts.service');

const charts = async (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
  const region = String(req.query.region || 'global');
  const chartWindow = String(req.query.window || 'this_week');

  try {
    const payload = await getChartsPayload({
      mode: 'songs',
      region,
      window: chartWindow,
      limit,
    });
    setCacheHeaders(res, chartCacheSeconds(chartWindow));
    res.json(payload);
  } catch (error) {
    console.warn('[charts] real data fetch failed:', error?.message || error);
    res.status(502).json({
      error: 'Chart data provider unavailable',
      detail: error?.message || 'Unknown charts error',
    });
  }
};

const chartArtists = async (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
  const region = String(req.query.region || 'global');
  const chartWindow = String(req.query.window || 'this_week');

  try {
    const payload = await getChartsPayload({
      mode: 'artists',
      region,
      window: chartWindow,
      limit,
    });
    setCacheHeaders(res, chartCacheSeconds(chartWindow));
    res.json(payload);
  } catch (error) {
    console.warn('[charts:artists] real data fetch failed:', error?.message || error);
    res.status(502).json({
      error: 'Artist chart data provider unavailable',
      detail: error?.message || 'Unknown charts error',
    });
  }
};

module.exports = {
  charts,
  chartArtists,
};
