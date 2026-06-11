const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { trackSnapshotSchema } = require('./shared');

const playlistTrackSchema = new mongoose.Schema(
  {
    ...trackSnapshotSchema.obj,
    addedAt: { type: Date, default: Date.now },
  },
  {
    _id: false,
    strict: 'throw',
  },
);

const playlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    playlistId: {
      type: String,
      required: true,
      trim: true,
      default: () => randomUUID(),
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 500 },
    pinned: { type: Boolean, default: false },
    tracks: { type: [playlistTrackSchema], default: [] },
  },
  {
    timestamps: true,
    strict: 'throw',
    versionKey: false,
  },
);

playlistSchema.index({ userId: 1, createdAt: -1 });
playlistSchema.index({ userId: 1, playlistId: 1 }, { unique: true });

playlistSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const out = { ...ret };
    out.id = out.playlistId;
    out.createdAt = new Date(out.createdAt).getTime();
    out.updatedAt = new Date(out.updatedAt).getTime();
    out.tracks = Array.isArray(out.tracks)
      ? out.tracks.map((track) => ({
          id: track.trackId,
          videoId: track.videoId || null,
          title: track.title || '',
          artist: track.artist || '',
          artistId: track.artistId || null,
          artistSlug: track.artistSlug || null,
          albumId: track.albumId || null,
          thumbnail: track.thumbnail || null,
          duration: track.duration || null,
          addedAt: new Date(track.addedAt || track.createdAt || Date.now()).getTime(),
        }))
      : [];
    delete out._id;
    delete out.userId;
    delete out.playlistId;
    return out;
  },
});

const Playlist = mongoose.models.Playlist || mongoose.model('Playlist', playlistSchema);

module.exports = {
  Playlist,
};
