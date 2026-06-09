const express = require('express');
const compression = require('compression');
const { createCorsMiddleware } = require('./middleware/cors');
const apiRoutes = require('./routes');

const createApp = () => {
  const app = express();
  app.set('trust proxy', 1);
  app.set('etag', 'strong');

  app.use(createCorsMiddleware());
  app.use(
    compression({
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
      },
    }),
  );
  app.use(express.json());

  app.use('/api', apiRoutes);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found', path: req.path });
  });

  return app;
};

module.exports = {
  createApp,
};
