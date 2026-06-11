const rateLimit = require('express-rate-limit');
const { authConfig } = require('../config');

const homeLimiter = rateLimit({
  windowMs: Number(process.env.HOME_RATE_LIMIT_WINDOW_MS) || 60000,
  max: Number(process.env.HOME_RATE_LIMIT_MAX) || 120,
  standardHeaders: true,
  legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: Number(process.env.SEARCH_RATE_LIMIT_WINDOW_MS) || 60000,
  max: Number(process.env.SEARCH_RATE_LIMIT_MAX) || 240,
  standardHeaders: true,
  legacyHeaders: false,
});

const lyricsLimiter = rateLimit({
  windowMs: Number(process.env.LYRICS_RATE_LIMIT_WINDOW_MS) || 60000,
  max: Number(process.env.LYRICS_RATE_LIMIT_MAX) || 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const detailLimiter = rateLimit({
  windowMs: Number(process.env.DETAIL_RATE_LIMIT_WINDOW_MS) || 60000,
  max: Number(process.env.DETAIL_RATE_LIMIT_MAX) || 90,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: authConfig.authRateLimitWindowMs,
  max: authConfig.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    return `${req.ip}:${email}`;
  },
  message: { error: 'Too many authentication attempts. Please try again shortly.' },
});

const authRegisterLimiter = rateLimit({
  windowMs: authConfig.authRateLimitWindowMs,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}`,
  message: { error: 'Too many registration attempts. Please try again shortly.' },
});

module.exports = {
  homeLimiter,
  searchLimiter,
  lyricsLimiter,
  detailLimiter,
  authLimiter,
  authRegisterLimiter,
};
