export const SURPRISE_SEEN_SESSION_KEY = 'octavia.surprise.seen.v1';
export const SURPRISE_SEEN_MAX = 1200;
export const SURPRISE_SEED_WORDS = [
  'midnight',
  'sunrise',
  'neon',
  'indie',
  'cinematic',
  'groove',
  'retro',
  'future',
  'electro',
  'acoustic',
  'dreamy',
  'underground',
];

const isBrowser = () =>
  typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';

export const surpriseTrackId = (track) => {
  const id = track?.id || track?.videoId || null;
  return id ? String(id) : null;
};

export const secureRandomInt = (max) => {
  if (!Number.isFinite(max) || max <= 0) return 0;
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const range = Math.floor(0x100000000 / max) * max;
    const buffer = new Uint32Array(1);
    let value = 0;
    do {
      crypto.getRandomValues(buffer);
      value = buffer[0];
    } while (value >= range);
    return value % max;
  }
  return Math.floor(Math.random() * max);
};

export const pickRandomItem = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return rows[secureRandomInt(rows.length)] || null;
};

export const shuffleRandomItems = (rows = []) => {
  if (!Array.isArray(rows) || rows.length <= 1) return Array.isArray(rows) ? [...rows] : [];
  const out = [...rows];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = secureRandomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const sanitizeSeenIds = (value, max = SURPRISE_SEEN_MAX) => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry) => (entry == null ? null : String(entry).trim()))
        .filter(Boolean),
    ),
  ).slice(0, max);
};

export const readSurpriseSeenIds = ({
  key = SURPRISE_SEEN_SESSION_KEY,
  max = SURPRISE_SEEN_MAX,
} = {}) => {
  if (!isBrowser()) return [];
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return [];
    return sanitizeSeenIds(JSON.parse(raw), max);
  } catch {
    return [];
  }
};

export const writeSurpriseSeenIds = (
  ids,
  {
    key = SURPRISE_SEEN_SESSION_KEY,
    max = SURPRISE_SEEN_MAX,
  } = {},
) => {
  if (!isBrowser()) return;
  try {
    const next = sanitizeSeenIds(ids, max);
    window.sessionStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
};

export const getSurpriseSeenSet = (options = {}) =>
  new Set(readSurpriseSeenIds(options));

export const addSurpriseSeenId = (
  id,
  {
    key = SURPRISE_SEEN_SESSION_KEY,
    max = SURPRISE_SEEN_MAX,
  } = {},
) => {
  const safeId = id == null ? null : String(id).trim();
  if (!safeId) return readSurpriseSeenIds({ key, max });
  const current = readSurpriseSeenIds({ key, max });
  const next = [safeId, ...current.filter((entry) => entry !== safeId)].slice(0, max);
  writeSurpriseSeenIds(next, { key, max });
  return next;
};

export const addSurpriseSeenTrack = (track, options = {}) => {
  const id = surpriseTrackId(track);
  return addSurpriseSeenId(id, options);
};

export const filterUnseenSurpriseTracks = (tracks = [], {
  seenSet = null,
  key = SURPRISE_SEEN_SESSION_KEY,
  max = SURPRISE_SEEN_MAX,
} = {}) => {
  const set = seenSet || getSurpriseSeenSet({ key, max });
  return (tracks || []).filter((track) => {
    const id = surpriseTrackId(track);
    if (!id) return false;
    return !set.has(id);
  });
};

export const buildSurpriseSeed = (
  words = SURPRISE_SEED_WORDS,
) => {
  const token = pickRandomItem(words) || 'surprise';
  const nonce = secureRandomInt(1_000_000_000);
  return `${token}-${nonce}`;
};

export default {
  SURPRISE_SEEN_SESSION_KEY,
  SURPRISE_SEEN_MAX,
  SURPRISE_SEED_WORDS,
  surpriseTrackId,
  secureRandomInt,
  pickRandomItem,
  shuffleRandomItems,
  readSurpriseSeenIds,
  writeSurpriseSeenIds,
  getSurpriseSeenSet,
  addSurpriseSeenId,
  addSurpriseSeenTrack,
  filterUnseenSurpriseTracks,
  buildSurpriseSeed,
};
