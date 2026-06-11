const express = require('express');
const { requireAuth, requireCsrf, requireOwnership } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../utils/async-handler');
const { Playlist } = require('../models/Playlist');
const {
  listFavorites,
  createFavorite,
  deleteFavorite,
  listLikedAlbums,
  createLikedAlbum,
  deleteLikedAlbum,
  listFollowedArtists,
  createFollowedArtist,
  deleteFollowedArtist,
  listPlaylists,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
  addPlaylistTrack,
  removePlaylistTrack,
  reorderPlaylistTracks,
  listHistory,
  createHistoryEntry,
  getSettings,
  updateSettings,
} = require('../controllers/library.controller');
const {
  favoriteCreateSchema,
  favoriteTrackParamSchema,
  likedAlbumCreateSchema,
  likedAlbumParamSchema,
  followedArtistCreateSchema,
  followedArtistParamSchema,
  playlistCreateSchema,
  playlistUpdateSchema,
  playlistParamSchema,
  playlistTrackAddSchema,
  playlistTrackRemoveSchema,
  playlistTrackReorderSchema,
  historyCreateSchema,
  historyListSchema,
  settingsPatchSchema,
} = require('../validators/library.validators');

const router = express.Router();

router.use(requireAuth);

router.get('/me/favorites', asyncHandler(listFavorites));
router.post('/me/favorites', requireCsrf, validate(favoriteCreateSchema), asyncHandler(createFavorite));
router.delete(
  '/me/favorites/:trackId',
  requireCsrf,
  validate(favoriteTrackParamSchema),
  asyncHandler(deleteFavorite),
);

router.get('/me/liked-albums', asyncHandler(listLikedAlbums));
router.post(
  '/me/liked-albums',
  requireCsrf,
  validate(likedAlbumCreateSchema),
  asyncHandler(createLikedAlbum),
);
router.delete(
  '/me/liked-albums/:albumId',
  requireCsrf,
  validate(likedAlbumParamSchema),
  asyncHandler(deleteLikedAlbum),
);

router.get('/me/followed-artists', asyncHandler(listFollowedArtists));
router.post(
  '/me/followed-artists',
  requireCsrf,
  validate(followedArtistCreateSchema),
  asyncHandler(createFollowedArtist),
);
router.delete(
  '/me/followed-artists/:artistId',
  requireCsrf,
  validate(followedArtistParamSchema),
  asyncHandler(deleteFollowedArtist),
);

router.get('/me/playlists', asyncHandler(listPlaylists));
router.post('/me/playlists', requireCsrf, validate(playlistCreateSchema), asyncHandler(createPlaylist));
router.patch(
  '/me/playlists/:id',
  requireCsrf,
  validate(playlistUpdateSchema),
  requireOwnership(Playlist, { lookupField: 'playlistId' }),
  asyncHandler(updatePlaylist),
);
router.delete(
  '/me/playlists/:id',
  requireCsrf,
  validate(playlistParamSchema),
  requireOwnership(Playlist, { lookupField: 'playlistId' }),
  asyncHandler(deletePlaylist),
);
router.post(
  '/me/playlists/:id/tracks',
  requireCsrf,
  validate(playlistTrackAddSchema),
  requireOwnership(Playlist, { lookupField: 'playlistId' }),
  asyncHandler(addPlaylistTrack),
);
router.delete(
  '/me/playlists/:id/tracks',
  requireCsrf,
  validate(playlistTrackRemoveSchema),
  requireOwnership(Playlist, { lookupField: 'playlistId' }),
  asyncHandler(removePlaylistTrack),
);
router.patch(
  '/me/playlists/:id/tracks',
  requireCsrf,
  validate(playlistTrackReorderSchema),
  requireOwnership(Playlist, { lookupField: 'playlistId' }),
  asyncHandler(reorderPlaylistTracks),
);

router.get('/me/history', validate(historyListSchema), asyncHandler(listHistory));
router.post('/me/history', requireCsrf, validate(historyCreateSchema), asyncHandler(createHistoryEntry));

router.get('/me/settings', asyncHandler(getSettings));
router.patch('/me/settings', requireCsrf, validate(settingsPatchSchema), asyncHandler(updateSettings));

module.exports = router;
