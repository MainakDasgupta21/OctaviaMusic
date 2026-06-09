const { setCacheHeaders } = require('../utils/cache');
const { getTrendingPayload } = require('../services/trending.service');

const trending = async (req, res) => {
  const payload = await getTrendingPayload({ limit: req.query.limit });
  setCacheHeaders(res);
  res.json(payload);
};

module.exports = {
  trending,
};
