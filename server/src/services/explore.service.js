const {
  fetchExplorePulse,
  fetchExploreRadio,
  fetchExploreSimilar,
  fetchExploreJourney,
} = require('../clients/explore.client');

const getExplorePulsePayload = ({ region }) =>
  fetchExplorePulse({ region });

const getExploreRadioPayload = ({
  mood,
  genre,
  seed,
  diversity,
  limit,
}) =>
  fetchExploreRadio({
    mood,
    genre,
    seed,
    diversity,
    limit,
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
};
