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

  it('records a search, normalizing the dedupe key and trimming overflow', async () => {
    const SearchHistoryModel = {
      ...makeNoopModel(),
      findOneAndUpdate: vi.fn(async () => ({
        toJSON: () => ({ id: 'blinding lights', query: 'Blinding Lights' }),
      })),
      find: vi.fn(() => ({
        sort: () => ({
          skip: () => ({
            select: () => ({
              lean: async () => [],
            }),
          }),
        }),
      })),
      deleteMany: vi.fn(async () => ({})),
    };

    const service = createLibraryService({
      FavoriteModel: makeNoopModel(),
      LikedAlbumModel: makeNoopModel(),
      FollowedArtistModel: makeNoopModel(),
      PlaylistModel: makeNoopModel(),
      ListeningHistoryModel: makeNoopModel(),
      SearchHistoryModel,
      UserModel: makeNoopModel(),
    });

    const item = await service.recordSearchHistory('user-123', '  Blinding Lights  ');

    expect(SearchHistoryModel.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: 'user-123', queryKey: 'blinding lights' },
      { $set: expect.objectContaining({ query: 'Blinding Lights', queryKey: 'blinding lights' }) },
      expect.objectContaining({ upsert: true, new: true }),
    );
    expect(item).toEqual({ id: 'blinding lights', query: 'Blinding Lights' });
  });

  it('rejects recording an empty search query', async () => {
    const service = createLibraryService({
      FavoriteModel: makeNoopModel(),
      LikedAlbumModel: makeNoopModel(),
      FollowedArtistModel: makeNoopModel(),
      PlaylistModel: makeNoopModel(),
      ListeningHistoryModel: makeNoopModel(),
      SearchHistoryModel: makeNoopModel(),
      UserModel: makeNoopModel(),
    });

    await expect(service.recordSearchHistory('user-123', '   ')).rejects.toThrow(
      /Search query is required/,
    );
  });

  it('removes one search by its normalized key and clears all per user', async () => {
    const SearchHistoryModel = {
      ...makeNoopModel(),
      deleteOne: vi.fn(async () => ({})),
      deleteMany: vi.fn(async () => ({})),
    };

    const service = createLibraryService({
      FavoriteModel: makeNoopModel(),
      LikedAlbumModel: makeNoopModel(),
      FollowedArtistModel: makeNoopModel(),
      PlaylistModel: makeNoopModel(),
      ListeningHistoryModel: makeNoopModel(),
      SearchHistoryModel,
      UserModel: makeNoopModel(),
    });

    await service.removeSearchHistory('user-123', 'Blinding Lights');
    expect(SearchHistoryModel.deleteOne).toHaveBeenCalledWith({
      userId: 'user-123',
      queryKey: 'blinding lights',
    });

    await service.clearSearchHistory('user-123');
    expect(SearchHistoryModel.deleteMany).toHaveBeenCalledWith({ userId: 'user-123' });
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
