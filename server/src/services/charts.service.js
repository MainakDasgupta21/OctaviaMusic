const {
  fetchRealChartData,
  normalizeWindow,
  getWindowTtlMs,
} = require('../clients/charts.client');

const getChartsPayload = async ({ mode, region, window, limit }) =>
  fetchRealChartData({
    mode,
    region,
    window,
    limit,
  });

const chartCacheSeconds = (chartWindow) =>
  Math.max(30, Math.round(getWindowTtlMs(normalizeWindow(chartWindow)) / 1000));

module.exports = {
  getChartsPayload,
  chartCacheSeconds,
};
