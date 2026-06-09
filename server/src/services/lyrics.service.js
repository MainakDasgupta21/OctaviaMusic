const { getLyrics } = require('../clients/lyrics.client');

const getLyricsPayload = ({ title, artist, durationSec, videoId }) =>
  getLyrics({ title, artist, durationSec, videoId });

module.exports = {
  getLyricsPayload,
};
