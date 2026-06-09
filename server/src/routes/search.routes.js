const express = require('express');
const { searchLimiter } = require('../middleware/rate-limiters');
const { search, searchSuggestions } = require('../controllers/search.controller');

const router = express.Router();

router.get('/search', searchLimiter, search);
router.get('/search/suggestions', searchLimiter, searchSuggestions);

module.exports = router;
