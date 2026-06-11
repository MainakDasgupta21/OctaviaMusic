const express = require('express');
const { detailLimiter } = require('../middleware/rate-limiters');
const { album, artist } = require('../controllers/detail.controller');
const { asyncHandler } = require('../utils/async-handler');

const router = express.Router();

router.get('/album/:id', detailLimiter, asyncHandler(album));
router.get('/artist/:slugOrId', detailLimiter, asyncHandler(artist));

module.exports = router;
