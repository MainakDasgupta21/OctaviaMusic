const { createHash, randomBytes, randomUUID, timingSafeEqual } = require('crypto');

const DURATION_RE = /^(\d+)\s*([smhd])$/i;
const DURATION_MULTIPLIER = {
  s: 1000,
  m: 60000,
  h: 60 * 60000,
  d: 24 * 60 * 60000,
};

const parseDurationToMs = (raw, fallbackMs) => {
  const value = String(raw || '').trim();
  const match = DURATION_RE.exec(value);
  if (!match) return fallbackMs;
  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) return fallbackMs;
  return amount * DURATION_MULTIPLIER[unit];
};

const hashToken = (token) =>
  createHash('sha256').update(String(token || ''), 'utf8').digest('hex');

const compareTokenHash = (leftHash, rightHash) => {
  if (!leftHash || !rightHash) return false;
  const left = Buffer.from(String(leftHash), 'hex');
  const right = Buffer.from(String(rightHash), 'hex');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

const createCsrfToken = () => randomBytes(24).toString('hex');

const createJti = () => randomUUID();

const buildAuthCookieOptions = (authConfig) => {
  const base = {
    httpOnly: true,
    secure: authConfig.cookieSecure,
    sameSite: 'lax',
    ...(authConfig.cookieDomain ? { domain: authConfig.cookieDomain } : {}),
  };

  return {
    access: {
      ...base,
      path: '/',
      maxAge: parseDurationToMs(authConfig.jwtAccessTtl, 15 * 60000),
    },
    refresh: {
      ...base,
      path: '/api/auth',
      maxAge: parseDurationToMs(authConfig.jwtRefreshTtl, 30 * 24 * 60 * 60000),
    },
    csrf: {
      httpOnly: false,
      secure: authConfig.cookieSecure,
      sameSite: 'lax',
      path: '/',
      ...(authConfig.cookieDomain ? { domain: authConfig.cookieDomain } : {}),
      maxAge: parseDurationToMs(authConfig.jwtRefreshTtl, 30 * 24 * 60 * 60000),
    },
  };
};

module.exports = {
  parseDurationToMs,
  hashToken,
  compareTokenHash,
  createCsrfToken,
  createJti,
  buildAuthCookieOptions,
};
