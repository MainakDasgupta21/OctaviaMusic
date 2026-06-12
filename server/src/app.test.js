/* global describe, it, expect */
const { createApp } = require('./app');

const withServer = async (handler) => {
  const app = createApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : null;
    return await handler({ port });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

describe('app health routes', () => {
  it('serves /api/health without requiring authentication', async () => {
    await withServer(async ({ port }) => {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      const payload = await response.json();

      expect(response.status).toBe(200);
      expect(payload).toEqual({ status: 'ok' });
    });
  });
});
