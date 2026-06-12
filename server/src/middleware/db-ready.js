const mongoose = require('mongoose');
const { ServiceUnavailableError } = require('../utils/app-errors');

const DB_READY_STATE_CONNECTED = 1;

const isDatabaseConnected = () => mongoose.connection.readyState === DB_READY_STATE_CONNECTED;

const readDbUnavailableMessage = () => {
  if (!process.env.MONGODB_URI) {
    return 'Authentication is unavailable because database is not configured.';
  }
  return 'Authentication is temporarily unavailable. Please try again shortly.';
};

const requireDatabaseConnection = (_req, _res, next) => {
  if (isDatabaseConnected()) return next();
  return next(new ServiceUnavailableError(readDbUnavailableMessage()));
};

module.exports = {
  DB_READY_STATE_CONNECTED,
  isDatabaseConnected,
  requireDatabaseConnection,
  readDbUnavailableMessage,
};
