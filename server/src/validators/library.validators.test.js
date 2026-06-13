/* global describe, it, expect */
const {
  favoriteCreateSchema,
  likedAlbumCreateSchema,
  followedArtistCreateSchema,
  searchHistoryCreateSchema,
  searchHistoryDeleteSchema,
  searchHistoryListSchema,
} = require('./library.validators');

const asRequest = (body) => ({ body, params: {}, query: {} });

describe('library validators tolerate client display fields', () => {
  it('accepts a favorite track carrying addedAt and strips it', () => {
    const result = favoriteCreateSchema.safeParse(
      asRequest({
        track: {
          id: 'dQw4w9WgXcQ',
          title: 'Never Gonna Give You Up',
          artist: 'Rick Astley',
          addedAt: 1700000000000,
        },
      }),
    );

    expect(result.success).toBe(true);
    expect(result.data.body.track).not.toHaveProperty('addedAt');
    expect(result.data.body.track.id).toBe('dQw4w9WgXcQ');
  });

  it('accepts a liked album carrying likedAt and strips it', () => {
    const result = likedAlbumCreateSchema.safeParse(
      asRequest({
        album: {
          id: 'album-1',
          title: 'Divide',
          artist: 'Ed Sheeran',
          likedAt: 1700000000000,
        },
      }),
    );

    expect(result.success).toBe(true);
    expect(result.data.body.album).not.toHaveProperty('likedAt');
    expect(result.data.body.album.id).toBe('album-1');
  });

  it('accepts a followed artist carrying followedAt and strips it', () => {
    const result = followedArtistCreateSchema.safeParse(
      asRequest({
        artist: {
          id: 'artist-1',
          name: 'Ed Sheeran',
          slug: 'ed-sheeran',
          followedAt: 1700000000000,
        },
      }),
    );

    expect(result.success).toBe(true);
    expect(result.data.body.artist).not.toHaveProperty('followedAt');
    expect(result.data.body.artist.id).toBe('artist-1');
  });
});

describe('search history validators', () => {
  it('accepts a non-empty query and strips extra fields', () => {
    const result = searchHistoryCreateSchema.safeParse(
      asRequest({ query: '  blinding lights  ', searchedAt: 1700000000000 }),
    );

    expect(result.success).toBe(true);
    expect(result.data.body.query).toBe('blinding lights');
    expect(result.data.body).not.toHaveProperty('searchedAt');
  });

  it('rejects an empty query', () => {
    const result = searchHistoryCreateSchema.safeParse(asRequest({ query: '   ' }));
    expect(result.success).toBe(false);
  });

  it('accepts a delete with an optional query target', () => {
    const withQuery = searchHistoryDeleteSchema.safeParse({
      body: {},
      params: {},
      query: { query: 'starboy' },
    });
    const clearAll = searchHistoryDeleteSchema.safeParse({
      body: {},
      params: {},
      query: {},
    });

    expect(withQuery.success).toBe(true);
    expect(withQuery.data.query.query).toBe('starboy');
    expect(clearAll.success).toBe(true);
  });

  it('coerces the list limit from the query string', () => {
    const result = searchHistoryListSchema.safeParse({
      body: {},
      params: {},
      query: { limit: '20' },
    });

    expect(result.success).toBe(true);
    expect(result.data.query.limit).toBe(20);
  });
});
