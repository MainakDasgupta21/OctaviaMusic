const express = require('express');
const { requireAuth, requireCsrf } = require('../middleware/auth');
const { requireDatabaseConnection } = require('../middleware/db-ready');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../utils/async-handler');
const {
  getSharedPlaylist,
  copySharedPlaylist,
} = require('../controllers/library.controller');
const {
  sharedPlaylistParamSchema,
  playlistCopyParamSchema,
} = require('../validators/library.validators');

const router = express.Router();

// Public, read-only view of a shared playlist. No auth required so anyone with
// the link can open it; still gated on a live database connection.
router.get(
  '/playlists/shared/:shareId',
  requireDatabaseConnection,
  validate(sharedPlaylistParamSchema),
  asyncHandler(getSharedPlaylist),
);

// Save an independent copy of a public playlist into the current user's
// library. Requires authentication (and CSRF when using cookie auth).
router.post(
  '/playlists/shared/:shareId/copy',
  requireDatabaseConnection,
  requireAuth,
  requireCsrf,
  validate(playlistCopyParamSchema),
  asyncHandler(copySharedPlaylist),
);

module.exports = router;
