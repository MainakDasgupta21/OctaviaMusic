const mongoose = require('mongoose');

mongoose.set('strictQuery', true);
mongoose.set('strict', 'throw');
mongoose.set('sanitizeFilter', true);

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const connectToDatabase = async ({ maxAttempts = 5, baseDelayMs = 800 } = {}) => {
  const mongoUri = process.env.MONGODB_URI;
  const isProd = process.env.NODE_ENV === 'production';

  if (!mongoUri) {
    if (isProd) {
      throw new Error('[db] MONGODB_URI is required in production.');
    }
    console.warn('[db] MONGODB_URI is not set. Auth and user-library APIs are disabled.');
    return false;
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await mongoose.connect(mongoUri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 7000,
      });
      const { host, name } = mongoose.connection;
      console.log(`[db] Connected to MongoDB (${host}/${name})`);
      return true;
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts;
      console.warn(
        `[db] Mongo connection attempt ${attempt}/${maxAttempts} failed: ${error?.message || error}`,
      );
      if (isLastAttempt) {
        throw new Error('[db] Unable to connect to MongoDB after multiple attempts.');
      }
      await sleep(baseDelayMs * attempt);
    }
  }

  return false;
};

module.exports = {
  connectToDatabase,
};
