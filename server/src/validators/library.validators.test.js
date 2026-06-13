/* global describe, it, expect */
const {
  favoriteCreateSchema,
  likedAlbumCreateSchema,
  followedArtistCreateSchema,
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
