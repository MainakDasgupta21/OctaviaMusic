/* global describe, it, expect */
const { vi } = globalThis;
const { createLibraryService } = require('./library.service');

const makeNoopModel = () => ({
  find: vi.fn(() => ({
    sort: () => ({
      limit: () => ({
        lean: async () => [],
      }),
      lean: async () => [],
    }),
  })),
  findOne: vi.fn(async () => null),
  findOneAndUpdate: vi.fn(async () => ({ toJSON: () => ({}) })),
  deleteOne: vi.fn(async () => ({})),
  deleteMany: vi.fn(async () => ({})),
  create: vi.fn(async (payload) => ({
    ...payload,
    save: async () => {},
    toJSON: () => payload,
  })),
  hydrate: (row) => ({ toJSON: () => row }),
  findById: vi.fn(async () => null),
});

describe('library.service ownership scoping', () => {
  it('scopes favorites lookup to the requesting user', async () => {
    const FavoriteModel = {
      ...makeNoopModel(),
      find: vi.fn(() => ({
        sort: () => ({
          lean: async () => [
            { trackId: 'track-1', title: 'Song', addedAt: new Date().toISOString() },
          ],
        }),
      })),
      hydrate: (row) => ({
        toJSON: () => ({ id: row.trackId, title: row.title }),
      }),
    };

    const service = createLibraryService({
      FavoriteModel,
      LikedAlbumModel: makeNoopModel(),
      FollowedArtistModel: makeNoopModel(),
      PlaylistModel: makeNoopModel(),
      ListeningHistoryModel: makeNoopModel(),
      UserModel: makeNoopModel(),
    });

    const items = await service.listFavorites('user-123');
    expect(FavoriteModel.find).toHaveBeenCalledWith({ userId: 'user-123' });
    expect(items).toEqual([{ id: 'track-1', title: 'Song' }]);
  });

  it('rejects playlist updates when playlist is not owned by requester', async () => {
    const PlaylistModel = {
      ...makeNoopModel(),
      findOne: vi.fn(async () => null),
    };

    const service = createLibraryService({
      FavoriteModel: makeNoopModel(),
      LikedAlbumModel: makeNoopModel(),
      FollowedArtistModel: makeNoopModel(),
      PlaylistModel,
      ListeningHistoryModel: makeNoopModel(),
      UserModel: makeNoopModel(),
    });

    await expect(
      service.updatePlaylist('user-123', 'playlist-abc', { name: 'Updated' }),
    ).rejects.toThrow(/Playlist not found/);
    expect(PlaylistModel.findOne).toHaveBeenCalledWith({
      userId: 'user-123',
      playlistId: 'playlist-abc',
    });
  });
});
