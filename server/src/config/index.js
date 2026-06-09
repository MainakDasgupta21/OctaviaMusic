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

module.exports = {
  configuredOrigins,
  isCorsOriginAllowed,
  YT_CHANNEL_ID_RE,
};
