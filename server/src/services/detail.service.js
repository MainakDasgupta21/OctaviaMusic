const catalog = require('../clients/catalog.client');
const ytm = require('../clients/ytmusic.client');
const { toAlbumDetailDTO, toArtistDetailDTO } = require('../clients/mappers.client');
const { YT_CHANNEL_ID_RE } = require('../config');
const { liveOrFallback } = require('../utils/http');

const getAlbumPayload = async ({ id }) =>
  liveOrFallback(
    async () => {
      const album = await ytm.getAlbum(id);
      const dto = await toAlbumDetailDTO(album, { resolveVideoId: ytm.resolveVideoId });
      if (!dto || !Array.isArray(dto.tracks) || dto.tracks.length === 0) return null;
      return dto;
    },
    () => catalog.getAlbum(id),
    `album(${id})`,
  );

const getArtistPayload = async ({ slugOrId }) => {
  const looksLikeChannelId = YT_CHANNEL_ID_RE.test(slugOrId);
  const live = async () => {
    if (looksLikeChannelId) {
      const artist = await ytm.getArtist(slugOrId);
      return toArtistDetailDTO(artist, { resolveVideoId: ytm.resolveVideoId });
    }

    const humanQuery = String(slugOrId || '').replace(/-/g, ' ').trim();
    if (!humanQuery) return null;

    const candidates = (await ytm.searchByType(humanQuery, 'artist')) || [];
    const list = Array.isArray(candidates) ? candidates : candidates.artists || [];
    const match = list.find((artist) => artist?.artistId);
    if (!match?.artistId) return null;

    const artist = await ytm.getArtist(match.artistId);
    return toArtistDetailDTO(artist, { resolveVideoId: ytm.resolveVideoId });
  };

  return liveOrFallback(
    live,
    () => catalog.getArtist(slugOrId),
    `artist(${slugOrId})`,
  );
};

module.exports = {
  getAlbumPayload,
  getArtistPayload,
};
