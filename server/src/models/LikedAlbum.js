const mongoose = require('mongoose');

const likedAlbumSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    albumId: { type: String, required: true, trim: true },
    title: { type: String, default: '' },
    artist: { type: String, default: '' },
    artistSlug: { type: String, default: null },
    thumbnail: { type: String, default: null },
    year: { type: String, default: null },
    likedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    strict: 'throw',
    versionKey: false,
  },
);

likedAlbumSchema.index({ userId: 1, createdAt: -1 });
likedAlbumSchema.index({ userId: 1, albumId: 1 }, { unique: true });

likedAlbumSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const out = { ...ret };
    out.id = out.albumId;
    out.likedAt = new Date(out.likedAt || out.createdAt).getTime();
    delete out._id;
    delete out.userId;
    delete out.albumId;
    return out;
  },
});

const LikedAlbum = mongoose.models.LikedAlbum || mongoose.model('LikedAlbum', likedAlbumSchema);

module.exports = {
  LikedAlbum,
};
