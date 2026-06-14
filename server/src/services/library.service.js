const { randomUUID, randomBytes } = require('crypto');
const { Favorite } = require('../models/Favorite');
const { LikedAlbum } = require('../models/LikedAlbum');
const { FollowedArtist } = require('../models/FollowedArtist');
const { Playlist } = require('../models/Playlist');
const { ListeningHistory } = require('../models/ListeningHistory');
const { SearchHistory } = require('../models/SearchHistory');
const { User, USER_SETTINGS_DEFAULTS } = require('../models/User');
const { NotFoundError, ValidationError, ConflictError } = require('../utils/app-errors');

const SEARCH_HISTORY_CAP = 50;
const LISTENING_HISTORY_CAP = 20;

const toObjectId = (value) => value;

const normalizeSearchQuery = (raw) => {
  const query = String(raw || '').trim();
  if (!query) throw new ValidationError('Search query is required');
  return { query, queryKey: query.toLowerCase() };
};

const normalizeTrack = (track, { requireTitle = false } = {}) => {
  const id = String(track?.id || '').trim();
  if (!id) throw new ValidationError('Track id is required');
  const title = String(track?.title || '').trim();
  if (requireTitle && !title) throw new ValidationError('Track title is required');
  return {
    trackId: id,
    videoId: track?.videoId || null,
    title: title || '',
    artist: String(track?.artist || '').trim(),
    artistId: track?.artistId || null,
    artistSlug: track?.artistSlug || null,
    albumId: track?.albumId || null,
    thumbnail: track?.thumbnail || null,
    duration: track?.duration || null,
  };
};

const dedupeTracks = (tracks) => {
  const seen = new Set();
  const out = [];
  for (const raw of tracks || []) {
    const normalized = normalizeTrack(raw);
    if (seen.has(normalized.trackId)) continue;
    seen.add(normalized.trackId);
    out.push(normalized);
  }
  return out;
};

const ensurePlaylist = async (PlaylistModel, userId, playlistId) => {
  const playlist = await PlaylistModel.findOne({ userId, playlistId });
  if (!playlist) throw new NotFoundError('Playlist not found');
  return playlist;
};

// Short, URL-safe public share token. Retries on the (astronomically rare)
// unique-index collision so the caller always gets a usable token.
const generateShareId = async (PlaylistModel) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = randomBytes(9).toString('base64url');
    // eslint-disable-next-line no-await-in-loop
    const clash = await PlaylistModel.exists({ shareId: candidate });
    if (!clash) return candidate;
  }
  throw new ConflictError('Could not generate a unique share link');
};

const createLibraryService = ({
  FavoriteModel = Favorite,
  LikedAlbumModel = LikedAlbum,
  FollowedArtistModel = FollowedArtist,
  PlaylistModel = Playlist,
  ListeningHistoryModel = ListeningHistory,
  SearchHistoryModel = SearchHistory,
  UserModel = User,
} = {}) => {
  const listFavorites = async (userId) =>
    FavoriteModel.find({ userId: toObjectId(userId) })
      .sort({ addedAt: -1, createdAt: -1 })
      .lean()
      .then((rows) => rows.map((row) => FavoriteModel.hydrate(row).toJSON()));

  const addFavorite = async (userId, track) => {
    const normalized = normalizeTrack(track, { requireTitle: true });
    const doc = await FavoriteModel.findOneAndUpdate(
      { userId: toObjectId(userId), trackId: normalized.trackId },
      { $set: { ...normalized, addedAt: new Date() } },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );
    return doc.toJSON();
  };

  const removeFavorite = async (userId, trackId) => {
    await FavoriteModel.deleteOne({
      userId: toObjectId(userId),
      trackId: String(trackId || ''),
    });
  };

  const listLikedAlbums = async (userId) =>
    LikedAlbumModel.find({ userId: toObjectId(userId) })
      .sort({ likedAt: -1, createdAt: -1 })
      .lean()
      .then((rows) => rows.map((row) => LikedAlbumModel.hydrate(row).toJSON()));

  const addLikedAlbum = async (userId, album) => {
    const albumId = String(album?.id || '').trim();
    if (!albumId) throw new ValidationError('Album id is required');
    const doc = await LikedAlbumModel.findOneAndUpdate(
      { userId: toObjectId(userId), albumId },
      {
        $set: {
          albumId,
          title: String(album?.title || '').trim(),
          artist: String(album?.artist || '').trim(),
          artistSlug: album?.artistSlug || null,
          thumbnail: album?.thumbnail || null,
          year: album?.year || null,
          likedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return doc.toJSON();
  };

  const removeLikedAlbum = async (userId, albumId) => {
    await LikedAlbumModel.deleteOne({
      userId: toObjectId(userId),
      albumId: String(albumId || ''),
    });
  };

  const listFollowedArtists = async (userId) =>
    FollowedArtistModel.find({ userId: toObjectId(userId) })
      .sort({ followedAt: -1, createdAt: -1 })
      .lean()
      .then((rows) => rows.map((row) => FollowedArtistModel.hydrate(row).toJSON()));

  const addFollowedArtist = async (userId, artist) => {
    const artistId = String(artist?.id || '').trim();
    if (!artistId) throw new ValidationError('Artist id is required');
    const doc = await FollowedArtistModel.findOneAndUpdate(
      { userId: toObjectId(userId), artistId },
      {
        $set: {
          artistId,
          slug: artist?.slug || artistId,
          name: String(artist?.name || '').trim(),
          thumbnail: artist?.thumbnail || null,
          followedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return doc.toJSON();
  };

  const removeFollowedArtist = async (userId, artistId) => {
    await FollowedArtistModel.deleteOne({
      userId: toObjectId(userId),
      artistId: String(artistId || ''),
    });
  };

  const listPlaylists = async (userId) =>
    PlaylistModel.find({ userId: toObjectId(userId) })
      .sort({ pinned: -1, updatedAt: -1, createdAt: -1 })
      .lean()
      .then((rows) => rows.map((row) => PlaylistModel.hydrate(row).toJSON()));

  const createPlaylist = async (userId, payload) => {
    const visibility = payload?.visibility === 'public' ? 'public' : 'private';
    const shareId =
      visibility === 'public' ? await generateShareId(PlaylistModel) : null;
    const playlist = await PlaylistModel.create({
      userId: toObjectId(userId),
      playlistId: String(payload?.id || '').trim() || randomUUID(),
      name: String(payload?.name || 'New playlist').trim(),
      description: String(payload?.description || '').trim(),
      pinned: Boolean(payload?.pinned),
      visibility,
      shareId,
      tracks: dedupeTracks(payload?.tracks).map((track) => ({
        ...track,
        addedAt: new Date(),
      })),
    });
    return playlist.toJSON();
  };

  const updatePlaylist = async (userId, playlistId, patch) => {
    const playlist = await ensurePlaylist(PlaylistModel, toObjectId(userId), playlistId);
    if (typeof patch.name === 'string') playlist.name = patch.name.trim() || playlist.name;
    if (typeof patch.description === 'string') playlist.description = patch.description.trim();
    if (typeof patch.pinned === 'boolean') playlist.pinned = patch.pinned;
    if (patch.visibility === 'public' || patch.visibility === 'private') {
      playlist.visibility = patch.visibility;
      // Generate a stable share token the first time a playlist is published;
      // keep it stable thereafter so shared links never break.
      if (patch.visibility === 'public' && !playlist.shareId) {
        playlist.shareId = await generateShareId(PlaylistModel);
      }
    }
    await playlist.save();
    return playlist.toJSON();
  };

  // Public read-only view of a shared playlist, resolved by its share token.
  // Returns the playlist plus a minimal owner descriptor; never leaks userId.
  const getSharedPlaylist = async (shareId) => {
    const token = String(shareId || '').trim();
    if (!token) throw new NotFoundError('Playlist not found');
    const playlist = await PlaylistModel.findOne({ shareId: token, visibility: 'public' });
    if (!playlist) throw new NotFoundError('Playlist not found');
    const owner = await UserModel.findById(playlist.userId)
      .select('displayName username')
      .lean();
    return {
      ...playlist.toJSON(),
      owner: {
        displayName: owner?.displayName || owner?.username || 'A listener',
      },
    };
  };

  // Save an independent copy of a public playlist into the current user's
  // library. The copy is always private and gets a fresh playlistId.
  const copySharedPlaylist = async (userId, shareId) => {
    const token = String(shareId || '').trim();
    if (!token) throw new NotFoundError('Playlist not found');
    const source = await PlaylistModel.findOne({ shareId: token, visibility: 'public' }).lean();
    if (!source) throw new NotFoundError('Playlist not found');
    const copy = await PlaylistModel.create({
      userId: toObjectId(userId),
      playlistId: randomUUID(),
      name: String(source.name || 'New playlist').trim(),
      description: String(source.description || '').trim(),
      pinned: false,
      visibility: 'private',
      shareId: null,
      tracks: dedupeTracks(
        (source.tracks || []).map((track) => ({
          id: track.trackId,
          videoId: track.videoId,
          title: track.title,
          artist: track.artist,
          artistId: track.artistId,
          artistSlug: track.artistSlug,
          albumId: track.albumId,
          thumbnail: track.thumbnail,
          duration: track.duration,
        })),
      ).map((track) => ({ ...track, addedAt: new Date() })),
    });
    return copy.toJSON();
  };

  const deletePlaylist = async (userId, playlistId) => {
    await PlaylistModel.deleteOne({
      userId: toObjectId(userId),
      playlistId: String(playlistId || ''),
    });
  };

  const addPlaylistTrack = async (userId, playlistId, track) => {
    const playlist = await ensurePlaylist(PlaylistModel, toObjectId(userId), playlistId);
    const normalized = normalizeTrack(track, { requireTitle: true });
    const exists = playlist.tracks.some((entry) => entry.trackId === normalized.trackId);
    if (!exists) {
      playlist.tracks.push({ ...normalized, addedAt: new Date() });
      await playlist.save();
    }
    return playlist.toJSON();
  };

  const removePlaylistTrack = async (userId, playlistId, trackId) => {
    const playlist = await ensurePlaylist(PlaylistModel, toObjectId(userId), playlistId);
    playlist.tracks = playlist.tracks.filter(
      (entry) => entry.trackId !== String(trackId || ''),
    );
    await playlist.save();
    return playlist.toJSON();
  };

  const reorderPlaylistTracks = async (userId, playlistId, trackIds) => {
    const playlist = await ensurePlaylist(PlaylistModel, toObjectId(userId), playlistId);
    const byId = new Map(playlist.tracks.map((entry) => [entry.trackId, entry]));
    const requested = Array.from(new Set(trackIds.map((id) => String(id || '').trim()))).filter(
      Boolean,
    );
    const reordered = [];
    requested.forEach((id) => {
      const entry = byId.get(id);
      if (entry) reordered.push(entry);
    });
    playlist.tracks.forEach((entry) => {
      if (!requested.includes(entry.trackId)) reordered.push(entry);
    });
    playlist.tracks = reordered;
    await playlist.save();
    return playlist.toJSON();
  };

  const listHistory = async (userId, { limit = LISTENING_HISTORY_CAP } = {}) =>
    ListeningHistoryModel.find({ userId: toObjectId(userId) })
      .sort({ playedAt: -1, updatedAt: -1 })
      .limit(Math.max(1, Math.min(200, Number(limit) || LISTENING_HISTORY_CAP)))
      .lean()
      .then((rows) => rows.map((row) => ListeningHistoryModel.hydrate(row).toJSON()));

  const addHistoryItem = async (userId, track, playedAt) => {
    const normalized = normalizeTrack(track, { requireTitle: true });
    const doc = await ListeningHistoryModel.findOneAndUpdate(
      { userId: toObjectId(userId), trackId: normalized.trackId },
      {
        $set: {
          ...normalized,
          playedAt: playedAt ? new Date(playedAt) : new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Keep only the most recent `LISTENING_HISTORY_CAP` plays per user so the
    // window stays fixed at 20 and the oldest play is evicted from the DB.
    const overflow = await ListeningHistoryModel.find({ userId: toObjectId(userId) })
      .sort({ playedAt: -1, updatedAt: -1 })
      .skip(LISTENING_HISTORY_CAP)
      .select('_id')
      .lean();
    if (overflow.length) {
      await ListeningHistoryModel.deleteMany({ _id: { $in: overflow.map((row) => row._id) } });
    }

    return doc.toJSON();
  };

  const listSearchHistory = async (userId, { limit = SEARCH_HISTORY_CAP } = {}) =>
    SearchHistoryModel.find({ userId: toObjectId(userId) })
      .sort({ searchedAt: -1, updatedAt: -1 })
      .limit(Math.max(1, Math.min(SEARCH_HISTORY_CAP, Number(limit) || SEARCH_HISTORY_CAP)))
      .lean()
      .then((rows) => rows.map((row) => SearchHistoryModel.hydrate(row).toJSON()));

  const recordSearchHistory = async (userId, rawQuery) => {
    const { query, queryKey } = normalizeSearchQuery(rawQuery);
    const doc = await SearchHistoryModel.findOneAndUpdate(
      { userId: toObjectId(userId), queryKey },
      { $set: { query, queryKey, searchedAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    // Keep only the most recent `SEARCH_HISTORY_CAP` terms per user so the
    // collection can't grow without bound.
    const overflow = await SearchHistoryModel.find({ userId: toObjectId(userId) })
      .sort({ searchedAt: -1, updatedAt: -1 })
      .skip(SEARCH_HISTORY_CAP)
      .select('_id')
      .lean();
    if (overflow.length) {
      await SearchHistoryModel.deleteMany({ _id: { $in: overflow.map((row) => row._id) } });
    }

    return doc.toJSON();
  };

  const removeSearchHistory = async (userId, rawQuery) => {
    const queryKey = String(rawQuery || '').trim().toLowerCase();
    if (!queryKey) return;
    await SearchHistoryModel.deleteOne({ userId: toObjectId(userId), queryKey });
  };

  const clearSearchHistory = async (userId) => {
    await SearchHistoryModel.deleteMany({ userId: toObjectId(userId) });
  };

  const getUserSettings = async (userId) => {
    const user = await UserModel.findById(userId).select('settings');
    if (!user) throw new NotFoundError('User not found');
    return { ...USER_SETTINGS_DEFAULTS, ...(user.settings?.toObject?.() || user.settings || {}) };
  };

  const updateUserSettings = async (userId, patch) => {
    const user = await UserModel.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    user.settings = {
      ...USER_SETTINGS_DEFAULTS,
      ...(user.settings?.toObject?.() || user.settings || {}),
      ...patch,
    };
    await user.save();
    return { ...USER_SETTINGS_DEFAULTS, ...(user.settings?.toObject?.() || user.settings || {}) };
  };

  const updateCurrentUser = async (userId, payload) => {
    const user = await UserModel.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    if (typeof payload.displayName === 'string') {
      user.displayName = payload.displayName.trim();
      user.settings = {
        ...USER_SETTINGS_DEFAULTS,
        ...(user.settings?.toObject?.() || user.settings || {}),
        displayName: payload.displayName.trim(),
      };
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'avatarUrl')) {
      user.avatarUrl = payload.avatarUrl || null;
    }
    if (typeof payload.email === 'string') {
      const nextEmail = payload.email.trim().toLowerCase();
      if (nextEmail !== user.email) {
        const taken = await UserModel.findOne({ email: nextEmail, _id: { $ne: user._id } })
          .select('_id')
          .lean();
        if (taken) throw new ConflictError('That email is already in use');
      }
      user.email = nextEmail;
      user.settings = {
        ...USER_SETTINGS_DEFAULTS,
        ...(user.settings?.toObject?.() || user.settings || {}),
        email: nextEmail,
      };
    }
    if (payload.settings && typeof payload.settings === 'object') {
      user.settings = {
        ...USER_SETTINGS_DEFAULTS,
        ...(user.settings?.toObject?.() || user.settings || {}),
        ...payload.settings,
      };
    }

    await user.save();
    return user.toSafeJSON ? user.toSafeJSON() : user.toJSON();
  };

  const listUsers = async ({ limit = 100 } = {}) =>
    UserModel.find({})
      .sort({ createdAt: -1 })
      .limit(Math.max(1, Math.min(200, Number(limit) || 100)))
      .select('_id email username displayName avatarUrl role createdAt updatedAt lastLoginAt')
      .lean();

  const updateUserRole = async (targetUserId, role) => {
    const user = await UserModel.findById(targetUserId);
    if (!user) throw new NotFoundError('User not found');
    user.role = role;
    await user.save();
    return user.toSafeJSON ? user.toSafeJSON() : user.toJSON();
  };

  const deleteUser = async (targetUserId) => {
    const user = await UserModel.findById(targetUserId);
    if (!user) throw new NotFoundError('User not found');
    await Promise.all([
      FavoriteModel.deleteMany({ userId: user._id }),
      LikedAlbumModel.deleteMany({ userId: user._id }),
      FollowedArtistModel.deleteMany({ userId: user._id }),
      PlaylistModel.deleteMany({ userId: user._id }),
      ListeningHistoryModel.deleteMany({ userId: user._id }),
      SearchHistoryModel.deleteMany({ userId: user._id }),
      UserModel.deleteOne({ _id: user._id }),
    ]);
  };

  return {
    listFavorites,
    addFavorite,
    removeFavorite,
    listLikedAlbums,
    addLikedAlbum,
    removeLikedAlbum,
    listFollowedArtists,
    addFollowedArtist,
    removeFollowedArtist,
    listPlaylists,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addPlaylistTrack,
    removePlaylistTrack,
    reorderPlaylistTracks,
    getSharedPlaylist,
    copySharedPlaylist,
    listHistory,
    addHistoryItem,
    listSearchHistory,
    recordSearchHistory,
    removeSearchHistory,
    clearSearchHistory,
    getUserSettings,
    updateUserSettings,
    updateCurrentUser,
    listUsers,
    updateUserRole,
    deleteUser,
  };
};

const libraryService = createLibraryService();

module.exports = {
  createLibraryService,
  ...libraryService,
};
