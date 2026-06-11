const express = require('express');
const { homeLimiter, searchLimiter } = require('../middleware/rate-limiters');
const {
  explorePulse,
  exploreRadio,
  exploreSimilar,
  exploreJourney,
} = require('../controllers/explore.controller');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

router.get('/explore/pulse', homeLimiter, asyncHandler(explorePulse));
router.get('/explore/radio', searchLimiter, asyncHandler(exploreRadio));
router.get('/explore/similar', searchLimiter, asyncHandler(exploreSimilar));
router.get('/explore/journeys/:id', homeLimiter, asyncHandler(exploreJourney));

module.exports = router;
