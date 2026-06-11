const mongoose = require('mongoose');

const followedArtistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    artistId: { type: String, required: true, trim: true },
    slug: { type: String, default: null },
    name: { type: String, default: '' },
    thumbnail: { type: String, default: null },
    followedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    strict: 'throw',
    versionKey: false,
  },
);

followedArtistSchema.index({ userId: 1, createdAt: -1 });
followedArtistSchema.index({ userId: 1, artistId: 1 }, { unique: true });

followedArtistSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const out = { ...ret };
    out.id = out.artistId;
    out.followedAt = new Date(out.followedAt || out.createdAt).getTime();
    delete out._id;
    delete out.userId;
    delete out.artistId;
    return out;
  },
});

const FollowedArtist =
  mongoose.models.FollowedArtist || mongoose.model('FollowedArtist', followedArtistSchema);

module.exports = {
  FollowedArtist,
};
