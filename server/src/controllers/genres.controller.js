const { setCacheHeaders } = require('../utils/cache');
const { getGenresPayload } = require('../services/genres.service');

const genres = async (_req, res) => {
  const payload = await getGenresPayload();
  setCacheHeaders(res, 60 * 60);
  res.json(payload);
};

module.exports = {
  genres,
};
