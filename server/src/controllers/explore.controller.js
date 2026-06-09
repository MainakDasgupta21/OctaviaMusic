const { setCacheHeaders } = require('../utils/cache');
const {
  getExplorePulsePayload,
  getExploreRadioPayload,
  getExploreSimilarPayload,
  getExploreJourneyPayload,
} = require('../services/explore.service');

const explorePulse = async (req, res) => {
  const region = String(req.query.region || 'global');
  try {
    const payload = await getExplorePulsePayload({ region });
    setCacheHeaders(res, 120);
    res.json(payload);
  } catch (error) {
    console.warn('[explore:pulse] failed:', error?.message || error);
    res.status(502).json({
      error: 'Explore pulse unavailable',
      detail: error?.message || 'Unknown pulse error',
    });
  }
};

const exploreRadio = async (req, res) => {
  const mood = String(req.query.mood || '');
  const genre = String(req.query.genre || '');
  const seed = String(req.query.seed || '');
  const diversity = String(req.query.diversity || 'default').trim().toLowerCase() === 'high'
    ? 'high'
    : 'default';
  const limit = Math.max(6, Math.min(60, Number(req.query.limit) || 24));

  try {
    const payload = await getExploreRadioPayload({
      mood,
      genre,
      seed,
      diversity,
      limit,
    });
    setCacheHeaders(res, 90);
    res.json(payload);
  } catch (error) {
    console.warn('[explore:radio] failed:', error?.message || error);
    res.status(502).json({
      error: 'Explore radio unavailable',
      detail: error?.message || 'Unknown radio error',
    });
  }
};

const exploreSimilar = async (req, res) => {
  const trackId = String(req.query.trackId || '').trim();
  const limit = Math.max(4, Math.min(30, Number(req.query.limit) || 12));
  if (!trackId) return res.status(400).json({ error: 'trackId is required' });

  try {
    const payload = await getExploreSimilarPayload({ trackId, limit });
    setCacheHeaders(res, 300);
    res.json(payload);
  } catch (error) {
    console.warn('[explore:similar] failed:', error?.message || error);
    res.status(502).json({
      error: 'Explore similar unavailable',
      detail: error?.message || 'Unknown similar error',
    });
  }
};

const exploreJourney = async (req, res) => {
  const journeyId = String(req.params.id || '').trim();
  const region = String(req.query.region || 'global');
  if (!journeyId) return res.status(400).json({ error: 'journey id is required' });

  try {
    const payload = await getExploreJourneyPayload({ journeyId, region });
    setCacheHeaders(res, 180);
    res.json(payload);
  } catch (error) {
    console.warn('[explore:journey] failed:', error?.message || error);
    res.status(502).json({
      error: 'Explore journey unavailable',
      detail: error?.message || 'Unknown journey error',
    });
  }
};

module.exports = {
  explorePulse,
  exploreRadio,
  exploreSimilar,
  exploreJourney,
};
