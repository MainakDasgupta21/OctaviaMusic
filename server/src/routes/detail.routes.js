const express = require('express');
const { detailLimiter } = require('../middleware/rate-limiters');
const { album, artist } = require('../controllers/detail.controller');

const router = express.Router();

router.get('/album/:id', detailLimiter, album);
router.get('/artist/:slugOrId', detailLimiter, artist);

module.exports = router;
