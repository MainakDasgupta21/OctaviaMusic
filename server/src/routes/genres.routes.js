const express = require('express');
const { searchLimiter } = require('../middleware/rate-limiters');
const { genres } = require('../controllers/genres.controller');

const router = express.Router();

router.get('/genres', searchLimiter, genres);

module.exports = router;
