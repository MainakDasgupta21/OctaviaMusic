const {
  z,
  idString,
  trackSchema,
  playlistInputSchema,
  settingsSchema,
} = require('./common');

const emptyParams = z.object({}).strict();
const emptyQuery = z.object({}).strict();

const favoriteCreateSchema = z.object({
  body: z.object({ track: trackSchema }).strict(),
  params: emptyParams,
  query: emptyQuery,
});

const favoriteTrackParamSchema = z.object({
  body: z.object({}).strict().optional().default({}),
  params: z.object({ trackId: idString }).strict(),
  query: emptyQuery,
});

const likedAlbumItemSchema = z
  .object({
    id: idString,
    title: z.string().trim().min(1).max(240),
    artist: z.string().trim().max(240).optional().default(''),
    artistSlug: z.string().trim().max(200).optional().nullable(),
    thumbnail: z.string().trim().max(500).optional().nullable(),
    year: z.string().trim().max(40).optional().nullable(),
  })
  // Tolerate client display-only fields (e.g. `likedAt`) by stripping them.
  .strip();

const likedAlbumCreateSchema = z.object({
  body: z.object({ album: likedAlbumItemSchema }).strict(),
  params: emptyParams,
  query: emptyQuery,
});

const likedAlbumParamSchema = z.object({
  body: z.object({}).strict().optional().default({}),
  params: z.object({ albumId: idString }).strict(),
  query: emptyQuery,
});

const followedArtistItemSchema = z
  .object({
    id: idString,
    slug: z.string().trim().max(200).optional().nullable(),
    name: z.string().trim().min(1).max(240),
    thumbnail: z.string().trim().max(500).optional().nullable(),
  })
  // Tolerate client display-only fields (e.g. `followedAt`) by stripping them.
  .strip();

const followedArtistCreateSchema = z.object({
  body: z.object({ artist: followedArtistItemSchema }).strict(),
  params: emptyParams,
  query: emptyQuery,
});

const followedArtistParamSchema = z.object({
  body: z.object({}).strict().optional().default({}),
  params: z.object({ artistId: idString }).strict(),
  query: emptyQuery,
});

const playlistCreateSchema = z.object({
  body: playlistInputSchema,
  params: emptyParams,
  query: emptyQuery,
});

const playlistUpdateSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(1).max(120).optional(),
      description: z.string().trim().max(500).optional(),
      pinned: z.boolean().optional(),
    })
    .strict()
    .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field must be updated',
    }),
  params: z.object({ id: idString }).strict(),
  query: emptyQuery,
});

const playlistParamSchema = z.object({
  body: z.object({}).strict().optional().default({}),
  params: z.object({ id: idString }).strict(),
  query: emptyQuery,
});

const playlistTrackAddSchema = z.object({
  body: z.object({ track: trackSchema }).strict(),
  params: z.object({ id: idString }).strict(),
  query: emptyQuery,
});

const playlistTrackRemoveSchema = z.object({
  body: z.object({ trackId: idString }).strict(),
  params: z.object({ id: idString }).strict(),
  query: emptyQuery,
});

const playlistTrackReorderSchema = z.object({
  body: z
    .object({
      trackIds: z.array(idString).min(1),
    })
    .strict(),
  params: z.object({ id: idString }).strict(),
  query: emptyQuery,
});

const historyCreateSchema = z.object({
  body: z
    .object({
      track: trackSchema,
      playedAt: z.number().int().positive().optional(),
    })
    .strict(),
  params: emptyParams,
  query: emptyQuery,
});

const historyListSchema = z.object({
  body: z.object({}).strict().optional().default({}),
  params: emptyParams,
  query: z
    .object({
      limit: z.coerce.number().int().min(1).max(200).optional(),
    })
    .strict()
    .optional()
    .default({}),
});

const searchQueryString = z.string().trim().min(1).max(160);

const searchHistoryListSchema = z.object({
  body: z.object({}).strict().optional().default({}),
  params: emptyParams,
  query: z
    .object({
      limit: z.coerce.number().int().min(1).max(50).optional(),
    })
    .strict()
    .optional()
    .default({}),
});

const searchHistoryCreateSchema = z.object({
  body: z.object({ query: searchQueryString }).strip(),
  params: emptyParams,
  query: emptyQuery,
});

const searchHistoryDeleteSchema = z.object({
  body: z.object({}).strict().optional().default({}),
  params: emptyParams,
  query: z
    .object({
      query: searchQueryString.optional(),
    })
    .strict()
    .optional()
    .default({}),
});

const settingsPatchSchema = z.object({
  body: settingsSchema.refine((value) => Object.keys(value).length > 0, {
    message: 'At least one setting must be provided',
  }),
  params: emptyParams,
  query: emptyQuery,
});

module.exports = {
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
  searchHistoryListSchema,
  searchHistoryCreateSchema,
  searchHistoryDeleteSchema,
  settingsPatchSchema,
};
