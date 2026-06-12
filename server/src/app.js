const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { createCorsMiddleware } = require('./middleware/cors');
const { errorHandler } = require('./middleware/errors');
const apiRoutes = require('./routes');

const createApp = () => {
  const app = express();
  app.set('trust proxy', 1);
  app.set('etag', 'strong');

  app.use(createCorsMiddleware());
  app.use(helmet());
  app.use(cookieParser());
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
  app.use(express.urlencoded({ extended: false }));

  app.get(['/health', '/api/health'], (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api', apiRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found', path: req.path });
  });
  app.use(errorHandler);

  return app;
};

module.exports = {
  createApp,
};
