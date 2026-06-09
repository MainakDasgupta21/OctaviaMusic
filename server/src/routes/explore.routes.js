const express = require('express');
const { homeLimiter, searchLimiter } = require('../middleware/rate-limiters');
const {
  explorePulse,
  exploreRadio,
  exploreSimilar,
  exploreJourney,
} = require('../controllers/explore.controller');

const router = express.Router();

router.get('/explore/pulse', homeLimiter, explorePulse);
router.get('/explore/radio', searchLimiter, exploreRadio);
router.get('/explore/similar', searchLimiter, exploreSimilar);
router.get('/explore/journeys/:id', homeLimiter, exploreJourney);

module.exports = router;
