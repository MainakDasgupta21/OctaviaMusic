export const DISCOVERY_MEMORY_KEY = 'octavia.explore.discovery.v3';
export const DISCOVERY_TRACK_MAX = 2000;
export const DISCOVERY_ARTIST_MAX = 600;
export const DISCOVERY_STRATEGY_MAX = 40;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const DISCOVERY_DECAY_MS = 30 * DAY_MS;
export const ARTIST_FATIGUE_HALF_LIFE_MS = 7 * DAY_MS;

const isBrowser = () =>
  typeof window !== 'undefined'
  && typeof window.localStorage !== 'undefined';

const nowMs = () => Date.now();

const createEmptyMemory = () => ({
  tracks: {},
  artists: {},
  strategies: [],
  updatedAt: nowMs(),
});

let runtimeMemory = null;
let storageSyncAttached = false;
const subscribers = new Set();

const safeNumber = (value, fallback = 0) =>
  Number.isFinite(value) ? Number(value) : fallback;

const clampPositiveInt = (value, fallback = 1) => {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
};

const normalize = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

export const discoveryTrackId = (track) => {
  const primary = String(track?.id || track?.videoId || '').trim();
  if (primary) return primary;
  const fallback = `${String(track?.title || '').trim()}::${String(track?.artist || '').trim()}`;
  return fallback === '::' ? null : fallback;
};

export const discoveryArtistKey = (value) => normalize(value);

const cloneMemory = (value) => ({
  tracks: { ...(value?.tracks || {}) },
  artists: { ...(value?.artists || {}) },
  strategies: Array.isArray(value?.strategies)
    ? value.strategies.map((entry) => ({
        name: String(entry?.name || '').trim(),
        ts: safeNumber(entry?.ts, nowMs()),
      }))
    : [],
  updatedAt: safeNumber(value?.updatedAt, nowMs()),
});

const emit = () => {
  const snapshot = cloneMemory(runtimeMemory || createEmptyMemory());
  subscribers.forEach((listener) => {
    try {
      listener(snapshot);
    } catch {
      /* listener errors are ignored */
    }
  });
};

const sanitizeTracks = (value, now = nowMs()) => {
  if (!value || typeof value !== 'object') return {};
  const rows = Object.entries(value)
    .map(([id, entry]) => {
      const key = String(id || '').trim();
      if (!key) return null;
      const ts = safeNumber(entry?.ts, now);
      const count = clampPositiveInt(entry?.count, 1);
      const sourceRaw = String(entry?.source || '').trim();
      return {
        id: key,
        entry: {
          ts,
          count,
          source: sourceRaw || null,
        },
      };
    })
    .filter(Boolean);
  return Object.fromEntries(rows.map((row) => [row.id, row.entry]));
};

const sanitizeArtists = (value, now = nowMs()) => {
  if (!value || typeof value !== 'object') return {};
  const rows = Object.entries(value)
    .map(([key, entry]) => {
      const artistKey = normalize(key);
      if (!artistKey) return null;
      return {
        key: artistKey,
        entry: {
          ts: safeNumber(entry?.ts, now),
          count: clampPositiveInt(entry?.count, 1),
        },
      };
    })
    .filter(Boolean);
  return Object.fromEntries(rows.map((row) => [row.key, row.entry]));
};

const sanitizeStrategies = (value, now = nowMs()) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => ({
      name: normalize(entry?.name),
      ts: safeNumber(entry?.ts, now),
    }))
    .filter((entry) => entry.name);
};

const pruneByAge = (rows, decayMs, now = nowMs()) =>
  rows.filter((row) => {
    const age = now - safeNumber(row?.ts, now);
    return age >= 0 && age <= decayMs;
  });

const pruneObjectMap = (value, { max, decayMs, now = nowMs() } = {}) => {
  const rows = Object.entries(value || {})
    .map(([key, entry]) => ({ key, ...entry }))
    .filter((row) => row.key);
  const fresh = pruneByAge(rows, decayMs, now)
    .sort((a, b) => safeNumber(b.ts, 0) - safeNumber(a.ts, 0))
    .slice(0, max);
  return Object.fromEntries(
    fresh.map((row) => {
      const { key, ...entry } = row;
      return [key, entry];
    }),
  );
};

const pruneStrategies = (rows, { max, decayMs, now = nowMs() } = {}) =>
  pruneByAge(rows, decayMs, now)
    .sort((a, b) => safeNumber(b.ts, 0) - safeNumber(a.ts, 0))
    .slice(0, max);

export const sanitizeMemory = (value) => {
  const now = nowMs();
  const cleaned = {
    tracks: sanitizeTracks(value?.tracks, now),
    artists: sanitizeArtists(value?.artists, now),
    strategies: sanitizeStrategies(value?.strategies, now),
    updatedAt: safeNumber(value?.updatedAt, now),
  };
  const prunedTracks = pruneObjectMap(cleaned.tracks, {
    max: DISCOVERY_TRACK_MAX,
    decayMs: DISCOVERY_DECAY_MS,
    now,
  });
  const prunedArtists = pruneObjectMap(cleaned.artists, {
    max: DISCOVERY_ARTIST_MAX,
    decayMs: DISCOVERY_DECAY_MS,
    now,
  });
  const prunedStrategies = pruneStrategies(cleaned.strategies, {
    max: DISCOVERY_STRATEGY_MAX,
    decayMs: DISCOVERY_DECAY_MS,
    now,
  });

  return {
    tracks: prunedTracks,
    artists: prunedArtists,
    strategies: prunedStrategies,
    updatedAt: now,
  };
};

const readFromStorage = () => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(DISCOVERY_MEMORY_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeToStorage = (value) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(DISCOVERY_MEMORY_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
};

const removeFromStorage = () => {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(DISCOVERY_MEMORY_KEY);
  } catch {
    /* storage unavailable */
  }
};

const attachStorageSync = () => {
  if (storageSyncAttached || !isBrowser() || typeof window.addEventListener !== 'function') return;
  window.addEventListener('storage', (event) => {
    if (event?.key !== DISCOVERY_MEMORY_KEY) return;
    const parsed = event.newValue ? (() => {
      try {
        return JSON.parse(event.newValue);
      } catch {
        return null;
      }
    })() : null;
    runtimeMemory = sanitizeMemory(parsed || createEmptyMemory());
    emit();
  });
  storageSyncAttached = true;
};

const getRuntime = () => {
  attachStorageSync();
  if (runtimeMemory) return runtimeMemory;
  runtimeMemory = sanitizeMemory(readFromStorage() || createEmptyMemory());
  return runtimeMemory;
};

const commit = (nextMemory) => {
  const sanitized = sanitizeMemory(nextMemory);
  runtimeMemory = sanitized;
  writeToStorage(sanitized);
  emit();
  return cloneMemory(sanitized);
};

const updateMemory = (mutator) => {
  const draft = cloneMemory(getRuntime());
  const next = typeof mutator === 'function' ? mutator(draft) || draft : draft;
  return commit(next);
};

export const loadMemory = () => cloneMemory(getRuntime());

export const getSeenTrackSet = ({ horizonMs = DISCOVERY_DECAY_MS } = {}) => {
  const safeHorizon = Math.max(DAY_MS, safeNumber(horizonMs, DISCOVERY_DECAY_MS));
  const now = nowMs();
  const set = new Set();
  const memory = loadMemory();
  Object.entries(memory.tracks).forEach(([id, entry]) => {
    const age = now - safeNumber(entry?.ts, now);
    if (age >= 0 && age <= safeHorizon) {
      set.add(id);
    }
  });
  return set;
};

export const getArtistFatigueMap = ({
  halfLifeMs = ARTIST_FATIGUE_HALF_LIFE_MS,
  horizonMs = DISCOVERY_DECAY_MS,
} = {}) => {
  const safeHalfLife = Math.max(DAY_MS, safeNumber(halfLifeMs, ARTIST_FATIGUE_HALF_LIFE_MS));
  const safeHorizon = Math.max(DAY_MS, safeNumber(horizonMs, DISCOVERY_DECAY_MS));
  const now = nowMs();
  const map = new Map();
  const memory = loadMemory();
  Object.entries(memory.artists).forEach(([artistKey, entry]) => {
    const age = now - safeNumber(entry?.ts, now);
    if (age < 0 || age > safeHorizon) return;
    const countWeight = Math.min(1, clampPositiveInt(entry?.count, 1) / 8);
    const recencyWeight = Math.pow(0.5, age / safeHalfLife);
    const fatigue = Math.max(0, Math.min(1, countWeight * recencyWeight));
    if (fatigue > 0) map.set(artistKey, fatigue);
  });
  return map;
};

export const markArtistSeen = (artist) => {
  const artistKey = discoveryArtistKey(artist);
  if (!artistKey) return loadMemory();
  return updateMemory((draft) => {
    const now = nowMs();
    const current = draft.artists[artistKey] || { ts: now, count: 0 };
    draft.artists[artistKey] = {
      ts: now,
      count: clampPositiveInt(current.count, 0) + 1,
    };
    draft.updatedAt = now;
    return draft;
  });
};

export const markTrackSeen = (track, source = 'explore') => {
  const trackId = discoveryTrackId(track);
  if (!trackId) return loadMemory();
  return updateMemory((draft) => {
    const now = nowMs();
    const current = draft.tracks[trackId] || { ts: now, count: 0, source: null };
    const safeSource = String(source || '').trim() || null;
    draft.tracks[trackId] = {
      ts: now,
      count: clampPositiveInt(current.count, 0) + 1,
      source: safeSource,
    };
    const artistKey = discoveryArtistKey(track?.artist || '');
    if (artistKey) {
      const artistCurrent = draft.artists[artistKey] || { ts: now, count: 0 };
      draft.artists[artistKey] = {
        ts: now,
        count: clampPositiveInt(artistCurrent.count, 0) + 1,
      };
    }
    draft.updatedAt = now;
    return draft;
  });
};

export const markStrategyUsed = (name) => {
  const strategyName = normalize(name);
  if (!strategyName) return loadMemory();
  return updateMemory((draft) => {
    const now = nowMs();
    draft.strategies = [{ name: strategyName, ts: now }, ...(draft.strategies || [])];
    draft.updatedAt = now;
    return draft;
  });
};

export const getRecentStrategies = ({
  window = 3,
  horizonMs = DISCOVERY_DECAY_MS,
} = {}) => {
  const safeWindow = Math.max(1, clampPositiveInt(window, 3));
  const safeHorizon = Math.max(DAY_MS, safeNumber(horizonMs, DISCOVERY_DECAY_MS));
  const now = nowMs();
  const memory = loadMemory();
  const out = [];
  for (const entry of memory.strategies || []) {
    if (out.length >= safeWindow) break;
    const age = now - safeNumber(entry?.ts, now);
    if (age < 0 || age > safeHorizon) continue;
    if (!entry?.name) continue;
    out.push(entry.name);
  }
  return out;
};

export const forgetOldest = (count = 1) => {
  const safeCount = Math.max(1, clampPositiveInt(count, 1));
  return updateMemory((draft) => {
    const trackRows = Object.entries(draft.tracks || {})
      .map(([id, entry]) => ({ id, ts: safeNumber(entry?.ts, 0) }))
      .sort((a, b) => a.ts - b.ts);
    trackRows.slice(0, safeCount).forEach((row) => {
      delete draft.tracks[row.id];
    });
    draft.updatedAt = nowMs();
    return draft;
  });
};

export const resetMemory = () => {
  runtimeMemory = createEmptyMemory();
  removeFromStorage();
  emit();
  return cloneMemory(runtimeMemory);
};

export const subscribeDiscoveryMemory = (listener) => {
  if (typeof listener !== 'function') return () => {};
  attachStorageSync();
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
};

export const __testing = {
  clearRuntimeCache: () => {
    runtimeMemory = null;
  },
};

export default {
  DISCOVERY_MEMORY_KEY,
  DISCOVERY_TRACK_MAX,
  DISCOVERY_ARTIST_MAX,
  DISCOVERY_STRATEGY_MAX,
  DAY_MS,
  DISCOVERY_DECAY_MS,
  ARTIST_FATIGUE_HALF_LIFE_MS,
  discoveryTrackId,
  discoveryArtistKey,
  loadMemory,
  getSeenTrackSet,
  getArtistFatigueMap,
  markTrackSeen,
  markArtistSeen,
  markStrategyUsed,
  getRecentStrategies,
  forgetOldest,
  resetMemory,
  subscribeDiscoveryMemory,
};
