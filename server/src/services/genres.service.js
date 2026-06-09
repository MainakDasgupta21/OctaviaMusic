const catalog = require('../clients/catalog.client');
const ytm = require('../clients/ytmusic.client');
const { toTrackDTO } = require('../clients/mappers.client');
const { liveOrFallback } = require('../utils/http');

const getGenresPayload = async () =>
  liveOrFallback(
    async () => {
      const base = catalog.getGenres();
      if (!Array.isArray(base) || base.length === 0) throw new Error('no genre seed');
      return Promise.all(
        base.map(async (genre) => {
          try {
            const sample = await ytm.getGenreSample(genre.label);
            const sampleTrack = sample ? toTrackDTO(sample) : genre.sampleTrack;
            return {
              ...genre,
              thumbnail: sampleTrack?.thumbnail || genre.thumbnail,
              sampleTrack: sampleTrack || genre.sampleTrack,
            };
          } catch {
            return genre;
          }
        }),
      );
    },
    () => catalog.getGenres(),
    'genres',
  );

module.exports = {
  getGenresPayload,
};
