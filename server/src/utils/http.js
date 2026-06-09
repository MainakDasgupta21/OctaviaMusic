// Keep the 404 payload shape stable for frontend `isNotFoundError` checks.
const sendOrNotFound = (req, res, payload) => {
  if (payload == null) {
    return res.status(404).json({ error: 'Not found', path: req.path });
  }
  return res.json(payload);
};

const isEmptyResult = (value) => {
  if (value == null) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') {
    if (Array.isArray(value.items)) return value.items.length === 0;
    if (Array.isArray(value.tracks)) return value.tracks.length === 0;
  }
  return false;
};

const liveOrFallback = async (live, fallback, label, options = {}) => {
  const { treatEmptyAsFailure = true } = options;
  try {
    const result = await live();
    if (treatEmptyAsFailure && isEmptyResult(result)) {
      console.warn(`[ytmusic] ${label} live returned empty, using fallback`);
      return fallback();
    }
    return result;
  } catch (err) {
    console.warn(`[ytmusic] ${label} live failed, using fallback:`, err?.message || err);
    return fallback();
  }
};

const dedupeById = (rows) => {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    if (!row || !row.id || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
};

const clampInt = (raw, { min, max, fallback }) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
};

module.exports = {
  sendOrNotFound,
  liveOrFallback,
  dedupeById,
  clampInt,
};
