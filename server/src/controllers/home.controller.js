const { setCacheHeaders } = require('../utils/cache');
const { getHomePayload, getHomeFeaturedPayload } = require('../services/home.service');

const home = async (req, res) => {
  const limit = Math.max(6, Math.min(100, Number(req.query.limit) || 20));
  const payload = await getHomePayload(limit);
  setCacheHeaders(res);
  res.json(payload);
};

const homeFeatured = async (_req, res) => {
  const featured = await getHomeFeaturedPayload();
  setCacheHeaders(res);
  res.json(featured);
};

module.exports = {
  home,
  homeFeatured,
};
