const setCacheHeaders = (res, ttlSec = Number(process.env.HOME_CACHE_TTL_SEC) || 300) => {
  const safeTtl = Math.max(30, Math.min(86_400, ttlSec));
  const swr = Math.min(3600, safeTtl * 2);
  const browserMaxAge = Math.min(safeTtl, 120);
  res.set(
    'Cache-Control',
    `public, max-age=${browserMaxAge}, s-maxage=${safeTtl}, stale-while-revalidate=${swr}`,
  );
};

module.exports = {
  setCacheHeaders,
};
