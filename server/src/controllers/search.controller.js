const { setCacheHeaders } = require('../utils/cache');
const { getSearchPayload, getSearchSuggestions } = require('../services/search.service');

const search = async (req, res) => {
  const payload = await getSearchPayload({
    q: req.query.q,
    type: req.query.type || req.query.filter,
    limit: req.query.limit,
  });
  setCacheHeaders(res, 120);
  res.json(payload);
};

const searchSuggestions = async (req, res) => {
  const suggestions = await getSearchSuggestions({ q: req.query.q });
  setCacheHeaders(res, 120);
  res.json({ suggestions });
};

module.exports = {
  search,
  searchSuggestions,
};
