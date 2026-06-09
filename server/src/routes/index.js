const express = require('express');
const searchRoutes = require('./search.routes');
const detailRoutes = require('./detail.routes');
const chartsRoutes = require('./charts.routes');
const homeRoutes = require('./home.routes');
const genresRoutes = require('./genres.routes');
const exploreRoutes = require('./explore.routes');
const lyricsRoutes = require('./lyrics.routes');

const router = express.Router();

router.use(searchRoutes);
router.use(detailRoutes);
router.use(chartsRoutes);
router.use(homeRoutes);
router.use(genresRoutes);
router.use(exploreRoutes);
router.use(lyricsRoutes);

module.exports = router;
