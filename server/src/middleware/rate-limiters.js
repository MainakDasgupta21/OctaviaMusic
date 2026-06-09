const rateLimit = require('express-rate-limit');

const homeLimiter = rateLimit({
  windowMs: Number(process.env.HOME_RATE_LIMIT_WINDOW_MS) || 60_000,
  max: Number(process.env.HOME_RATE_LIMIT_MAX) || 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: Number(process.env.SEARCH_RATE_LIMIT_WINDOW_MS) || 60_000,
  max: Number(process.env.SEARCH_RATE_LIMIT_MAX) || 240,
  standardHeaders: true,
  legacyHeaders: false,
});

const lyricsLimiter = rateLimit({
  windowMs: Number(process.env.LYRICS_RATE_LIMIT_WINDOW_MS) || 60_000,
  max: Number(process.env.LYRICS_RATE_LIMIT_MAX) || 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const detailLimiter = rateLimit({
  windowMs: Number(process.env.DETAIL_RATE_LIMIT_WINDOW_MS) || 60_000,
  max: Number(process.env.DETAIL_RATE_LIMIT_MAX) || 90,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  homeLimiter,
  searchLimiter,
  lyricsLimiter,
  detailLimiter,
};
