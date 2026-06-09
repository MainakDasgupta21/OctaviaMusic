const { setCacheHeaders } = require('../utils/cache');
const { getLyricsPayload } = require('../services/lyrics.service');

const lyrics = async (req, res) => {
  const title = String(req.query.title || '').trim();
  const artist = String(req.query.artist || '').trim();
  const videoId = String(req.query.videoId || req.query.id || req.query.trackId || '').trim();
  const durationRaw = Number(req.query.duration);
  const durationSec =
    Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : undefined;

  if ((!title || !artist) && !videoId) {
    return res
      .status(400)
      .json({ error: 'title+artist or videoId is required' });
  }

  try {
    const payload = await getLyricsPayload({ title, artist, durationSec, videoId });
    if (!payload) {
      setCacheHeaders(res, 300, 600);
      return res.status(404).json({ error: 'Lyrics not found' });
    }
    setCacheHeaders(res, 3600, 86400);
    return res.json(payload);
  } catch (err) {
    console.warn(
      `[lyrics] lookup failed for "${title}" by "${artist}":`,
      err?.message || err,
    );
    return res.status(502).json({ error: 'Lyrics provider unavailable' });
  }
};

module.exports = {
  lyrics,
};
