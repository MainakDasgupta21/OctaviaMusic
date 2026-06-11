const mongoose = require('mongoose');

const trackSnapshotSchema = new mongoose.Schema(
  {
    trackId: { type: String, required: true, trim: true },
    videoId: { type: String, default: null },
    title: { type: String, default: '' },
    artist: { type: String, default: '' },
    artistId: { type: String, default: null },
    artistSlug: { type: String, default: null },
    albumId: { type: String, default: null },
    thumbnail: { type: String, default: null },
    duration: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  {
    _id: false,
    strict: 'throw',
  },
);

module.exports = {
  trackSnapshotSchema,
};
