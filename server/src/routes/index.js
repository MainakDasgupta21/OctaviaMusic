const express = require('express');
const searchRoutes = require('./search.routes');
const detailRoutes = require('./detail.routes');
const chartsRoutes = require('./charts.routes');
const homeRoutes = require('./home.routes');
const genresRoutes = require('./genres.routes');
const exploreRoutes = require('./explore.routes');
const lyricsRoutes = require('./lyrics.routes');
const authRoutes = require('./auth.routes');
const meRoutes = require('./me.routes');
const usersRoutes = require('./users.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.use(searchRoutes);
router.use(detailRoutes);
router.use(chartsRoutes);
router.use(homeRoutes);
router.use(genresRoutes);
router.use(exploreRoutes);
router.use(lyricsRoutes);
router.use(authRoutes);
router.use(meRoutes);
router.use(usersRoutes);
router.use(adminRoutes);

module.exports = router;
