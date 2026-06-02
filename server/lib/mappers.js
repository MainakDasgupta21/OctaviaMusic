// =============================================================================
// Adapters that translate the `ytmusic-api` shapes into the camelCase DTOs the
// React app already consumes. The contract is set by the pages — see
// `src/pages/{AlbumPage,ArtistPage,SearchPage,ChartsPage,HomePage}.jsx` and
// the comment at the top of `server/data/catalog.js`.
//
// Every track DTO MUST carry a `videoId` — FooterPlayer feeds that straight
// into `<ReactPlayer src="https://www.youtube.com/watch?v=...">`.
// =============================================================================

// -----------------------------------------------------------------------------
// Small helpers
// -----------------------------------------------------------------------------

// "m:ss" formatting matching the existing catalog. Falls back to "0:00" so the
// UI's `sumDuration` parser never NaNs.
const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

// YouTube Music thumbnails arrive sorted ascending. Pick the largest one and
// rewrite the size hint so the CDN serves a 544px asset (matches the upgrade
// the frontend api.js used to do on its own).
const pickThumbnail = (thumbnails) => {
  if (!Array.isArray(thumbnails) || thumbnails.length === 0) return null;
  const best = thumbnails.reduce(
    (acc, t) => (t && (t.width || 0) > (acc.width || 0) ? t : acc),
    thumbnails[0],
  );
  const url = best?.url;
  if (!url) return null;
  return url
    .replace(/=w\d+-h\d+/, '=w544-h544')
    .replace(/=s\d+/, '=s544');
};

// YT thumbnail fallback when we only have a videoId (e.g. for tracks that come
// from a playlist where the thumbnail array might be sparse).
const ytImage = (videoId) =>
  videoId ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg` : null;

// -----------------------------------------------------------------------------
// Track / song
// -----------------------------------------------------------------------------

/**
 * `src` can be a SongDetailed, VideoDetailed, or a song inside an AlbumFull /
 * ArtistFull. They all share `videoId`, `name`, `artist`, `thumbnails`, and
 * (mostly) `duration`. Album / artist context can be passed in `ctx` to
 * pre-populate fields the upstream object didn't carry.
 */
const toTrackDTO = (src, ctx = {}) => {
  if (!src || !src.videoId) return null;
  const artistName = src.artist?.name || ctx.artistName || 'Unknown artist';
  const artistId = src.artist?.artistId || ctx.artistId || null;
  const albumName = src.album?.name ?? ctx.albumName ?? null;
  const albumId = src.album?.albumId ?? ctx.albumId ?? null;
  const thumbnail = pickThumbnail(src.thumbnails) || ctx.thumbnail || ytImage(src.videoId);

  return {
    id: src.videoId,
    type: 'song',
    videoId: src.videoId,
    title: src.name || 'Untitled',
    artist: artistName,
    artistId,
    // Slug doubles as the URL segment for /artist/:slug — using the YTM channel
    // id keeps the round-trip to getArtist(slug) working.
    artistSlug: artistId,
    album: albumName,
    albumId,
    duration: formatDuration(src.duration),
    thumbnail,
    plays: null,
    releaseDate: null,
  };
};

// -----------------------------------------------------------------------------
// Album
// -----------------------------------------------------------------------------

const toAlbumSummaryDTO = (src) => {
  if (!src || !src.albumId) return null;
  const artistName = src.artist?.name || 'Unknown artist';
  const artistId = src.artist?.artistId || null;
  return {
    id: src.albumId,
    type: 'album',
    title: src.name || 'Untitled',
    artist: artistName,
    artistId,
    artistSlug: artistId,
    year: src.year ?? null,
    thumbnail: pickThumbnail(src.thumbnails),
  };
};

// Async because upstream `getAlbum` returns `songs[]` with empty `videoId`s in
// the current `ytmusic-api` release; we resolve a playable id per song via
// `resolveVideoId` (concurrent + cached).
const toAlbumDetailDTO = async (src, { resolveVideoId } = {}) => {
  const summary = toAlbumSummaryDTO(src);
  if (!summary) return null;
  const albumCover = pickThumbnail(src.thumbnails);
  const songs = src.songs || [];

  const resolved = await Promise.all(
    songs.map(async (song) => {
      if (song.videoId) return song;
      if (!resolveVideoId) return song;
      const hit = await resolveVideoId(
        song.name,
        song.artist?.name || src.artist?.name,
      ).catch(() => null);
      if (!hit) return song;
      return {
        ...song,
        videoId: hit.videoId,
        // Prefer original song duration when present; otherwise borrow from hit.
        duration: song.duration ?? hit.duration ?? null,
        thumbnails: song.thumbnails?.length ? song.thumbnails : hit.thumbnails,
      };
    }),
  );

  const tracks = resolved
    .map((song) =>
      toTrackDTO(song, {
        albumName: src.name,
        albumId: src.albumId,
        artistName: src.artist?.name,
        artistId: src.artist?.artistId,
        thumbnail: albumCover,
      }),
    )
    .filter(Boolean);

  return {
    ...summary,
    label: null,
    cover: albumCover || summary.thumbnail,
    tracks,
  };
};

// -----------------------------------------------------------------------------
// Artist
// -----------------------------------------------------------------------------

const toArtistSummaryDTO = (src) => {
  if (!src || !src.artistId) return null;
  return {
    id: src.artistId,
    type: 'artist',
    slug: src.artistId,
    name: src.name || 'Unknown artist',
    verified: false,
    monthly: null,
    thumbnail: pickThumbnail(src.thumbnails),
  };
};

// Async because we may need to back-fill empty `videoId`s on `topSongs` via a
// targeted resolve (see album mapping for context). We also merge in
// `topVideos` — those already carry videoIds and are the most reliable source.
const toArtistDetailDTO = async (src, { resolveVideoId } = {}) => {
  const summary = toArtistSummaryDTO(src);
  if (!summary) return null;
  const thumbnail = pickThumbnail(src.thumbnails);

  const resolvedSongs = await Promise.all(
    (src.topSongs || []).map(async (song) => {
      if (song.videoId) return song;
      if (!resolveVideoId) return song;
      const hit = await resolveVideoId(song.name, src.name).catch(() => null);
      if (!hit) return song;
      return {
        ...song,
        videoId: hit.videoId,
        duration: song.duration ?? hit.duration ?? null,
        thumbnails: song.thumbnails?.length ? song.thumbnails : hit.thumbnails,
      };
    }),
  );

  // Combine resolved top songs (rich metadata: album info) with top videos
  // (always playable). Resolved songs come first, then any new videos.
  const ctx = { artistName: src.name, artistId: src.artistId };
  const songDTOs = resolvedSongs.map((s) => toTrackDTO(s, ctx)).filter(Boolean);
  const videoDTOs = (src.topVideos || []).map((v) => toTrackDTO(v, ctx)).filter(Boolean);

  const seen = new Set();
  const topTracks = [];
  for (const t of [...songDTOs, ...videoDTOs]) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    topTracks.push(t);
    if (topTracks.length >= 8) break;
  }

  // Merge top albums + singles into a single discography list, newest first.
  const albums = [...(src.topAlbums || []), ...(src.topSingles || [])]
    .map(toAlbumSummaryDTO)
    .filter(Boolean)
    .sort((a, b) => (b.year || 0) - (a.year || 0));

  return {
    ...summary,
    cover: thumbnail,
    bio: null,
    topTracks,
    albums,
  };
};

module.exports = {
  formatDuration,
  pickThumbnail,
  ytImage,
  toTrackDTO,
  toAlbumSummaryDTO,
  toAlbumDetailDTO,
  toArtistSummaryDTO,
  toArtistDetailDTO,
};
