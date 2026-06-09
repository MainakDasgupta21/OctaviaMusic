const express = require('express');
const { homeLimiter } = require('../middleware/rate-limiters');
const { home, homeFeatured } = require('../controllers/home.controller');
const { trending } = require('../controllers/trending.controller');

const router = express.Router();

router.get('/home', homeLimiter, home);
router.get('/home/featured', homeLimiter, homeFeatured);
router.get('/trending', homeLimiter, trending);

module.exports = router;
