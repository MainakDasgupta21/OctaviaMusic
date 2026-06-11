const express = require('express');
const { lyricsLimiter } = require('../middleware/rate-limiters');
const { lyrics } = require('../controllers/lyrics.controller');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

router.get('/lyrics', lyricsLimiter, asyncHandler(lyrics));

module.exports = router;
