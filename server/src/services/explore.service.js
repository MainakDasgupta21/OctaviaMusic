const {
  fetchExplorePulse,
  fetchExploreRadio,
  fetchExploreSimilar,
  fetchExploreJourney,
  EXPLORE_RADIO_STRATEGIES,
} = require('../clients/explore.client');

const getExplorePulsePayload = ({ region }) =>
  fetchExplorePulse({ region });

const getExploreRadioPayload = ({
  mood,
  genre,
  seed,
  diversity,
  strategy,
  seedArtists,
  limit,
  region,
}) =>
  fetchExploreRadio({
    mood,
    genre,
    seed,
    diversity,
    strategy,
    seedArtists,
    limit,
    region,
  });

const getExploreSimilarPayload = ({ trackId, limit }) =>
  fetchExploreSimilar({ trackId, limit });

const getExploreJourneyPayload = ({ journeyId, region }) =>
  fetchExploreJourney({ journeyId, region });

module.exports = {
  getExplorePulsePayload,
  getExploreRadioPayload,
  getExploreSimilarPayload,
  getExploreJourneyPayload,
  EXPLORE_RADIO_STRATEGIES,
};
