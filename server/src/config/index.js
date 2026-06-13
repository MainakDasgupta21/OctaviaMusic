const DEV_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const parseOrigins = (value) =>
  String(value || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const configuredOrigins = parseOrigins(process.env.CORS_ORIGIN);

const isCorsOriginAllowed = (origin) => {
  if (!origin) return true;
  if (configuredOrigins.includes('*') || configuredOrigins.includes(origin)) return true;
  if (DEV_ORIGIN_RE.test(origin)) return true;
  return false;
};

const YT_CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{20,}$/;

const parseBoolean = (value, fallback = false) => {
  if (value == null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
};

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const authConfig = {
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
  jwtAccessTtl: process.env.JWT_ACCESS_TTL || '15m',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL || '30d',
  bcryptRounds: Math.max(12, parsePositiveInt(process.env.BCRYPT_ROUNDS, 12)),
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  cookieSecure:
    process.env.COOKIE_SECURE == null
      ? process.env.NODE_ENV === 'production'
      : parseBoolean(process.env.COOKIE_SECURE, process.env.NODE_ENV === 'production'),
  cookieSameSite: process.env.COOKIE_SAMESITE || '',
  authRateLimitWindowMs: parsePositiveInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 60000),
  authRateLimitMax: parsePositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 10),
};

const assertAuthConfig = () => {
  if (process.env.NODE_ENV !== 'production') return;

  const missing = [];
  if (!process.env.MONGODB_URI) missing.push('MONGODB_URI');
  if (!authConfig.jwtAccessSecret) missing.push('JWT_ACCESS_SECRET');
  if (!authConfig.jwtRefreshSecret) missing.push('JWT_REFRESH_SECRET');

  if (missing.length > 0) {
    throw new Error(
      `[config] Missing required env vars in production: ${missing.join(', ')}`,
    );
  }

  if (Buffer.byteLength(authConfig.jwtAccessSecret, 'utf8') < 32) {
    throw new Error('[config] JWT_ACCESS_SECRET must be at least 32 bytes.');
  }
  if (Buffer.byteLength(authConfig.jwtRefreshSecret, 'utf8') < 32) {
    throw new Error('[config] JWT_REFRESH_SECRET must be at least 32 bytes.');
  }
};

module.exports = {
  configuredOrigins,
  isCorsOriginAllowed,
  YT_CHANNEL_ID_RE,
  authConfig,
  assertAuthConfig,
};
