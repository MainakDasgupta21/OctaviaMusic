const cors = require('cors');
const { configuredOrigins, isCorsOriginAllowed } = require('../config');

const createCorsMiddleware = () => {
  if (process.env.NODE_ENV === 'production' && configuredOrigins.length === 0) {
    console.warn('[cors] CORS_ORIGIN is not set. Only localhost origins are currently allowed.');
  }

  return cors({
    origin: (origin, cb) => {
      cb(null, isCorsOriginAllowed(origin));
    },
    credentials: true,
  });
};

module.exports = {
  createCorsMiddleware,
};
