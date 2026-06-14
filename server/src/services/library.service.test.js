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

describe('library.service playlist sharing', () => {
  const baseDeps = () => ({
    FavoriteModel: makeNoopModel(),
    LikedAlbumModel: makeNoopModel(),
    FollowedArtistModel: makeNoopModel(),
    PlaylistModel: makeNoopModel(),
    ListeningHistoryModel: makeNoopModel(),
    SearchHistoryModel: makeNoopModel(),
    UserModel: makeNoopModel(),
  });

  it('creates a private playlist with no share id by default', async () => {
    const PlaylistModel = makeNoopModel();
    const service = createLibraryService({ ...baseDeps(), PlaylistModel });

    const result = await service.createPlaylist('user-1', {
      id: 'p-1',
      name: 'Chill',
      tracks: [],
    });

    expect(result.visibility).toBe('private');
    expect(result.shareId).toBeNull();
  });

  it('generates a stable share id when a playlist is created public', async () => {
    const PlaylistModel = { ...makeNoopModel(), exists: vi.fn(async () => null) };
    const service = createLibraryService({ ...baseDeps(), PlaylistModel });

    const result = await service.createPlaylist('user-1', {
      id: 'p-2',
      name: 'Party',
      visibility: 'public',
    });

    expect(result.visibility).toBe('public');
    expect(typeof result.shareId).toBe('string');
    expect(result.shareId.length).toBeGreaterThan(0);
    expect(PlaylistModel.exists).toHaveBeenCalled();
  });

  it('returns a public shared playlist with its owner display name', async () => {
    const PlaylistModel = {
      ...makeNoopModel(),
      findOne: vi.fn(async () => ({
        userId: 'owner-1',
        toJSON: () => ({
          id: 'p-3',
          name: 'Shared',
          visibility: 'public',
          shareId: 'tok',
          tracks: [],
        }),
      })),
    };
    const UserModel = {
      ...makeNoopModel(),
      findById: vi.fn(() => ({
        select: () => ({ lean: async () => ({ displayName: 'Alice' }) }),
      })),
    };
    const service = createLibraryService({ ...baseDeps(), PlaylistModel, UserModel });

    const result = await service.getSharedPlaylist('tok');

    expect(PlaylistModel.findOne).toHaveBeenCalledWith({ shareId: 'tok', visibility: 'public' });
    expect(result.owner.displayName).toBe('Alice');
    expect(result.name).toBe('Shared');
  });

  it('throws when a shared playlist is missing or not public', async () => {
    const PlaylistModel = { ...makeNoopModel(), findOne: vi.fn(async () => null) };
    const service = createLibraryService({ ...baseDeps(), PlaylistModel });

    await expect(service.getSharedPlaylist('missing')).rejects.toThrow(/Playlist not found/);
  });

  it('copies a public playlist into the requesting user library as an independent private copy', async () => {
    const PlaylistModel = {
      ...makeNoopModel(),
      findOne: vi.fn(() => ({
        lean: async () => ({
          userId: 'owner-1',
          name: 'Shared',
          description: 'desc',
          visibility: 'public',
          shareId: 'tok',
          tracks: [{ trackId: 't1', title: 'Song', videoId: 'v1' }],
        }),
      })),
    };
    const service = createLibraryService({ ...baseDeps(), PlaylistModel });

    const result = await service.copySharedPlaylist('user-9', 'tok');

    expect(PlaylistModel.findOne).toHaveBeenCalledWith({ shareId: 'tok', visibility: 'public' });
    expect(PlaylistModel.create).toHaveBeenCalled();
    expect(result.userId).toBe('user-9');
    expect(result.visibility).toBe('private');
    expect(result.shareId).toBeNull();
    expect(result.name).toBe('Shared');
    expect(result.tracks).toHaveLength(1);
    expect(result.tracks[0].trackId).toBe('t1');
  });
});
