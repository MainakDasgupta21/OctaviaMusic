const { setCacheHeaders } = require('../utils/cache');
const { sendOrNotFound } = require('../utils/http');
const { getAlbumPayload, getArtistPayload } = require('../services/detail.service');

const album = async (req, res) => {
  const payload = await getAlbumPayload({ id: req.params.id });
  setCacheHeaders(res, 30 * 60);
  sendOrNotFound(req, res, payload);
};

const artist = async (req, res) => {
  const payload = await getArtistPayload({ slugOrId: req.params.slugOrId });
  setCacheHeaders(res, 30 * 60);
  sendOrNotFound(req, res, payload);
};

module.exports = {
  album,
  artist,
};
