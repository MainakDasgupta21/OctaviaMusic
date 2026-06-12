/* global describe, it, expect, afterEach */
const mongoose = require('mongoose');
const { requireDatabaseConnection, DB_READY_STATE_CONNECTED } = require('./db-ready');

const runMiddleware = (middleware, req = {}) =>
  new Promise((resolve) => {
    middleware(req, {}, (error) => resolve(error));
  });

const ORIGINAL_READY_STATE = mongoose.connection.readyState;
const ORIGINAL_MONGO_URI = process.env.MONGODB_URI;

const restoreMongoUri = () => {
  if (ORIGINAL_MONGO_URI == null) {
    delete process.env.MONGODB_URI;
    return;
  }
  process.env.MONGODB_URI = ORIGINAL_MONGO_URI;
};

afterEach(() => {
  mongoose.connection.readyState = ORIGINAL_READY_STATE;
  restoreMongoUri();
});

describe('db readiness middleware', () => {
  it('allows requests while database is connected', async () => {
    mongoose.connection.readyState = DB_READY_STATE_CONNECTED;
    const error = await runMiddleware(requireDatabaseConnection, {});
    expect(error).toBeUndefined();
  });

  it('returns 503 with a config message when MONGODB_URI is missing', async () => {
    mongoose.connection.readyState = 0;
    delete process.env.MONGODB_URI;

    const error = await runMiddleware(requireDatabaseConnection, {});
    expect(error?.statusCode).toBe(503);
    expect(error?.message).toMatch(/database is not configured/i);
  });

  it('returns 503 with a temporary outage message when DB is disconnected', async () => {
    mongoose.connection.readyState = 0;
    process.env.MONGODB_URI = 'mongodb+srv://example';

    const error = await runMiddleware(requireDatabaseConnection, {});
    expect(error?.statusCode).toBe(503);
    expect(error?.message).toMatch(/temporarily unavailable/i);
  });
});
