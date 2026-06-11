const { createApp } = require('./src/app');
const ytm = require('./src/clients/ytmusic.client');
const { connectToDatabase } = require('./src/db/connect');
const { assertAuthConfig } = require('./src/config');

const PORT = process.env.PORT || 5000;
const app = createApp();

const startServer = async () => {
  assertAuthConfig();
  await connectToDatabase();
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);

    if (process.env.NODE_ENV === 'test' || process.env.YTM_WARMUP === 'false') return;

    setImmediate(async () => {
      const t0 = Date.now();
      const results = await Promise.allSettled([
        ytm.getYTMusic(),
        ytm.getChartsLive(50).catch(() => []),
        ytm.getTrendingLive(50).catch(() => []),
      ]);
      const failed = results.filter((result) => result.status === 'rejected').length;
      const elapsed = Date.now() - t0;
      if (failed === 0) {
        console.log(`[warmup] YTMusic ready, charts + trending primed (${elapsed}ms)`);
      } else {
        console.warn(
          `[warmup] completed in ${elapsed}ms with ${failed}/${results.length} failures (will retry on demand)`,
        );
      }
    });
  });
};

startServer().catch((error) => {
  console.error('[startup] Failed to start server:', error?.message || error);
  process.exit(1);
});
