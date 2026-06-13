const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // `query` is the original-cased term the user typed; `queryKey` is the
    // normalized (lowercased) form used for per-user de-duplication.
    query: { type: String, required: true, trim: true },
    queryKey: { type: String, required: true, trim: true },
    searchedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    strict: 'throw',
    versionKey: false,
  },
);

searchHistorySchema.index({ userId: 1, searchedAt: -1 });
searchHistorySchema.index({ userId: 1, queryKey: 1 }, { unique: true });

searchHistorySchema.set('toJSON', {
  transform: (_doc, ret) => {
    const out = { ...ret };
    out.id = out.queryKey;
    out.searchedAt = new Date(out.searchedAt || out.updatedAt || out.createdAt).getTime();
    delete out._id;
    delete out.userId;
    return out;
  },
});

const SearchHistory =
  mongoose.models.SearchHistory || mongoose.model('SearchHistory', searchHistorySchema);

module.exports = {
  SearchHistory,
};
