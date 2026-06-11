const express = require('express');
const { searchLimiter } = require('../middleware/rate-limiters');
const { charts, chartArtists } = require('../controllers/charts.controller');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

router.get('/charts', searchLimiter, asyncHandler(charts));
router.get('/charts/artists', searchLimiter, asyncHandler(chartArtists));

module.exports = router;
