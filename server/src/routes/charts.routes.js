const express = require('express');
const { searchLimiter } = require('../middleware/rate-limiters');
const { charts, chartArtists } = require('../controllers/charts.controller');

const router = express.Router();

router.get('/charts', searchLimiter, charts);
router.get('/charts/artists', searchLimiter, chartArtists);

module.exports = router;
