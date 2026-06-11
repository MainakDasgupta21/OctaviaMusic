const express = require('express');
const { searchLimiter } = require('../middleware/rate-limiters');
const { genres } = require('../controllers/genres.controller');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

router.get('/genres', searchLimiter, asyncHandler(genres));

module.exports = router;
