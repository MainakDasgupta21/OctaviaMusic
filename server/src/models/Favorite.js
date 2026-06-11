const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    trackId: { type: String, required: true, trim: true },
    videoId: { type: String, default: null },
    title: { type: String, default: '' },
    artist: { type: String, default: '' },
    artistId: { type: String, default: null },
    artistSlug: { type: String, default: null },
    albumId: { type: String, default: null },
    thumbnail: { type: String, default: null },
    duration: { type: String, default: null },
    addedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    strict: 'throw',
    versionKey: false,
  },
);

favoriteSchema.index({ userId: 1, createdAt: -1 });
favoriteSchema.index({ userId: 1, trackId: 1 }, { unique: true });

favoriteSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const out = { ...ret };
    out.id = out.trackId;
    out.addedAt = new Date(out.addedAt || out.createdAt).getTime();
    delete out._id;
    delete out.userId;
    delete out.trackId;
    return out;
  },
});

const Favorite = mongoose.models.Favorite || mongoose.model('Favorite', favoriteSchema);

module.exports = {
  Favorite,
};
