const express = require('express');
const { searchLimiter } = require('../middleware/rate-limiters');
const { search, searchSuggestions } = require('../controllers/search.controller');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

router.get('/search', searchLimiter, asyncHandler(search));
router.get('/search/suggestions', searchLimiter, asyncHandler(searchSuggestions));

module.exports = router;
