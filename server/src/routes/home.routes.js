const express = require('express');
const { homeLimiter } = require('../middleware/rate-limiters');
const { home, homeFeatured } = require('../controllers/home.controller');
const { trending } = require('../controllers/trending.controller');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

router.get('/home', homeLimiter, asyncHandler(home));
router.get('/home/featured', homeLimiter, asyncHandler(homeFeatured));
router.get('/trending', homeLimiter, asyncHandler(trending));

module.exports = router;
