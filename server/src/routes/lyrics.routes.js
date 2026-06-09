const express = require('express');
const { lyricsLimiter } = require('../middleware/rate-limiters');
const { lyrics } = require('../controllers/lyrics.controller');

const router = express.Router();

router.get('/lyrics', lyricsLimiter, lyrics);

module.exports = router;
