const libraryService = require('../services/library.service');

const listFavorites = async (req, res) => {
  const items = await libraryService.listFavorites(req.user._id);
  res.json({ items });
};

const createFavorite = async (req, res) => {
  const item = await libraryService.addFavorite(req.user._id, req.body.track);
  res.status(201).json({ item });
};

const deleteFavorite = async (req, res) => {
  await libraryService.removeFavorite(req.user._id, req.params.trackId);
  res.status(204).send();
};

const listLikedAlbums = async (req, res) => {
  const items = await libraryService.listLikedAlbums(req.user._id);
  res.json({ items });
};

const createLikedAlbum = async (req, res) => {
  const item = await libraryService.addLikedAlbum(req.user._id, req.body.album);
  res.status(201).json({ item });
};

const deleteLikedAlbum = async (req, res) => {
  await libraryService.removeLikedAlbum(req.user._id, req.params.albumId);
  res.status(204).send();
};

const listFollowedArtists = async (req, res) => {
  const items = await libraryService.listFollowedArtists(req.user._id);
  res.json({ items });
};

const createFollowedArtist = async (req, res) => {
  const item = await libraryService.addFollowedArtist(req.user._id, req.body.artist);
  res.status(201).json({ item });
};

const deleteFollowedArtist = async (req, res) => {
  await libraryService.removeFollowedArtist(req.user._id, req.params.artistId);
  res.status(204).send();
};

const listPlaylists = async (req, res) => {
  const items = await libraryService.listPlaylists(req.user._id);
  res.json({ items });
};

const createPlaylist = async (req, res) => {
  const item = await libraryService.createPlaylist(req.user._id, req.body);
  res.status(201).json({ item });
};

const updatePlaylist = async (req, res) => {
  const item = await libraryService.updatePlaylist(req.user._id, req.params.id, req.body);
  res.json({ item });
};

const deletePlaylist = async (req, res) => {
  await libraryService.deletePlaylist(req.user._id, req.params.id);
  res.status(204).send();
};

const addPlaylistTrack = async (req, res) => {
  const item = await libraryService.addPlaylistTrack(req.user._id, req.params.id, req.body.track);
  res.json({ item });
};

const removePlaylistTrack = async (req, res) => {
  const item = await libraryService.removePlaylistTrack(
    req.user._id,
    req.params.id,
    req.body.trackId,
  );
  res.json({ item });
};

const reorderPlaylistTracks = async (req, res) => {
  const item = await libraryService.reorderPlaylistTracks(
    req.user._id,
    req.params.id,
    req.body.trackIds,
  );
  res.json({ item });
};

const listHistory = async (req, res) => {
  const items = await libraryService.listHistory(req.user._id, { limit: req.query.limit });
  res.json({ items });
};

const createHistoryEntry = async (req, res) => {
  const item = await libraryService.addHistoryItem(
    req.user._id,
    req.body.track,
    req.body.playedAt,
  );
  res.status(201).json({ item });
};

const listSearchHistory = async (req, res) => {
  const items = await libraryService.listSearchHistory(req.user._id, { limit: req.query.limit });
  res.json({ items });
};

const createSearchHistory = async (req, res) => {
  const item = await libraryService.recordSearchHistory(req.user._id, req.body.query);
  res.status(201).json({ item });
};

const deleteSearchHistory = async (req, res) => {
  const query = req.query.query;
  if (query) {
    await libraryService.removeSearchHistory(req.user._id, query);
  } else {
    await libraryService.clearSearchHistory(req.user._id);
  }
  res.status(204).send();
};

const getSettings = async (req, res) => {
  const settings = await libraryService.getUserSettings(req.user._id);
  res.json({ settings });
};

const updateSettings = async (req, res) => {
  const settings = await libraryService.updateUserSettings(req.user._id, req.body);
  res.json({ settings });
};

module.exports = {
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
  listSearchHistory,
  createSearchHistory,
  deleteSearchHistory,
  getSettings,
  updateSettings,
};
