import { pickPlaceholder, sanitizeImageUrl, sanitizeTrackList } from '@/lib/media-sanitize';

export const EXPLORE_TASTE_SEED_KEY = 'octavia.explore.taste-seed.v1';
export const EXPLORE_TASTE_PROFILE_KEY = 'octavia.explore.profile.v1';

const MAX_TRACK_FEEDBACK = 80;
const MAX_FEEDBACK_EVENTS = 120;

export const EXPLORE_ENERGY_LEVELS = [
  {
    id: 'calm',
    label: 'Calm and steady',
    keywords: ['calm', 'gentle', 'ambient', 'soft', 'slow'],
  },
  {
    id: 'steady',
    label: 'Balanced groove',
    keywords: ['groove', 'steady', 'warm', 'feel good', 'bounce'],
  },
  {
    id: 'high',
    label: 'Maximum energy',
    keywords: ['energy', 'hype', 'dance', 'anthem', 'party'],
  },
];

export const EXPLORE_ACTIVITIES = [
  {
    id: 'working',
    label: 'Working',
    keywords: ['focus', 'instrumental', 'study', 'coding', 'productive'],
  },
  {
    id: 'chilling',
    label: 'Chilling',
    keywords: ['chill', 'mellow', 'lofi', 'downtempo', 'late night'],
  },
  {
    id: 'heartbroken',
    label: 'Heartbroken',
    keywords: ['sad', 'breakup', 'ballad', 'cry', 'emotional'],
  },
  {
    id: 'partying',
    label: 'Partying',
    keywords: ['party', 'club', 'dance', 'hype', 'bass'],
  },
  {
    id: 'driving',
    label: 'Driving',
    keywords: ['drive', 'road trip', 'night drive', 'cruise', 'highway'],
  },
];

const ENERGY_BY_ID = Object.fromEntries(
  EXPLORE_ENERGY_LEVELS.map((entry) => [entry.id, entry]),
);
const ACTIVITY_BY_ID = Object.fromEntries(
  EXPLORE_ACTIVITIES.map((entry) => [entry.id, entry]),
);

const SEARCH_TO_EXPLORE_MOOD = {
  live: 'workout',
  acoustic: 'morning',
  remix: 'workout',
  instrumental: 'focus',
};

const ACTIVITY_TO_MOOD = {
  working: 'focus',
  chilling: 'lounge',
  heartbroken: 'evening',
  partying: 'workout',
  driving: 'cafe',
};

const ENERGY_TO_MOOD = {
  calm: 'morning',
  steady: 'lounge',
  high: 'workout',
};

const MOOD_GENRE_HINTS = {
  focus: ['ambient', 'instrumental', 'piano', 'chill'],
  morning: ['acoustic', 'folk', 'indie', 'singer songwriter'],
  evening: ['soul', 'rnb', 'jazz', 'blues'],
  workout: ['edm', 'dance', 'hip hop', 'electro'],
  lounge: ['lofi', 'electronic', 'chill', 'house'],
  cafe: ['indie', 'acoustic', 'folk', 'pop'],
};

// Shared mood vocabulary for Home deep-links + Explore radio building.
export const EXPLORE_MOODS = [
  {
    id: 'focus',
    label: 'Deep focus',
    chipLabel: 'Focus',
    dropCap: 'F',
    keywords: ['focus', 'instrumental', 'piano', 'ambient', 'study'],
    mix: 'from-[#1a2236]/85 via-[#0f1525]/70 to-transparent',
    chipGradient: 'from-cyan-500/55 to-sky-700/65',
  },
  {
    id: 'morning',
    label: 'First light',
    chipLabel: 'Morning',
    dropCap: 'M',
    keywords: ['morning', 'sunrise', 'acoustic', 'folk', 'soft'],
    mix: 'from-[#3a1f10]/85 via-[#1f120a]/70 to-transparent',
    chipGradient: 'from-amber-400/65 to-orange-600/65',
  },
  {
    id: 'evening',
    label: 'Slow evenings',
    chipLabel: 'Evening',
    dropCap: 'E',
    keywords: ['evening', 'slow', 'soul', 'jazz', 'night'],
    mix: 'from-[#28122b]/85 via-[#170818]/70 to-transparent',
    chipGradient: 'from-indigo-500/55 to-purple-700/60',
  },
  {
    id: 'workout',
    label: 'Workout',
    chipLabel: 'Workout',
    dropCap: 'W',
    keywords: ['workout', 'energy', 'gym', 'edm', 'hip hop'],
    mix: 'from-[#3a1212]/85 via-[#1c0808]/70 to-transparent',
    chipGradient: 'from-rose-500/65 to-red-600/65',
  },
  {
    id: 'lounge',
    label: 'Late lounge',
    chipLabel: 'Lounge',
    dropCap: 'L',
    keywords: ['lounge', 'chill', 'lofi', 'electronic', 'late night'],
    mix: 'from-[#0f2226]/85 via-[#0a1417]/70 to-transparent',
    chipGradient: 'from-violet-500/60 to-fuchsia-700/60',
  },
  {
    id: 'cafe',
    label: 'Cafe hours',
    chipLabel: 'Cafe',
    dropCap: 'C',
    keywords: ['cafe', 'coffee', 'indie', 'mellow', 'acoustic'],
    mix: 'from-[#241808]/85 via-[#140d05]/70 to-transparent',
    chipGradient: 'from-emerald-500/55 to-teal-700/60',
  },
];

const SOURCE_FRESHNESS = {
  trending: 1,
  chartsFresh: 0.85,
  chartsClassic: 0.45,
  discovery: 0.95,
  favorite: 0.55,
  history: 0.5,
};

const SOURCE_WEIGHT = {
  trending: 1,
  chartsFresh: 0.9,
  chartsClassic: 0.7,
  discovery: 0.92,
  favorite: 0.78,
  history: 0.68,
};

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');

const tokenize = (value) =>
  normalize(value)
    .split(' ')
    .filter((token) => token.length > 1);

const dedupeStrings = (list) => Array.from(new Set((list || []).filter(Boolean)));

const stringOrNull = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const idOf = (track) =>
  String(track?.id || track?.videoId || `${track?.title || ''}::${track?.artist || ''}`);

const artistKeyOf = (track) => normalize(track?.artist || '');

const textForTrack = (track) => {
  const tags = Array.isArray(track?.genre) ? track.genre.join(' ') : '';
  return normalize(`${track?.title || ''} ${track?.artist || ''} ${track?.album || ''} ${tags}`);
};

const dedupeTracks = (rows) => {
  const seen = new Set();
  const out = [];
  for (const track of rows || []) {
    const key = idOf(track);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(track);
  }
  return out;
};

const stableHash = (value) => {
  const text = String(value || '');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
};

const mulberry32 = (seed) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const seededTrackRandom = (seed) => {
  const root = stableHash(seed);
  return (track) => {
    const perTrackSeed = stableHash(`${root}:${idOf(track)}`);
    return mulberry32(perTrackSeed)();
  };
};

const sourceSetOf = (track) => new Set(track?._sources || []);

const isFreshTrack = (track) => {
  const set = sourceSetOf(track);
  return set.has('trending') || set.has('chartsFresh');
};

const isClassicTrack = (track) => sourceSetOf(track).has('chartsClassic');

const keywordHits = (track, keywords = []) => {
  if (!keywords.length) return 0;
  const haystack = textForTrack(track);
  return keywords.reduce((count, keyword) => {
    const key = normalize(keyword);
    if (!key) return count;
    return haystack.includes(key) ? count + 1 : count;
  }, 0);
};

const overlapCount = (a = [], b = []) => {
  const right = new Set((b || []).map((value) => normalize(value)).filter(Boolean));
  if (!right.size) return 0;
  return (a || []).reduce((count, value) => {
    const key = normalize(value);
    return key && right.has(key) ? count + 1 : count;
  }, 0);
};

const buildConsumedIdSet = ({ history = [], favorites = [] } = {}) =>
  new Set([...history, ...favorites].map((track) => idOf(track)));

const normalizeExcludeSet = (excludeIds = null) =>
  new Set(
    Array.from(excludeIds || [])
      .map((value) => String(value || '').trim())
      .filter(Boolean),
  );

const resolveArtistFatigue = (artistFatigue, track) => {
  if (!artistFatigue) return 0;
  const key = artistKeyOf(track);
  if (!key) return 0;
  if (artistFatigue instanceof Map) {
    return Math.max(0, Math.min(1, Number(artistFatigue.get(key)) || 0));
  }
  if (typeof artistFatigue === 'object') {
    return Math.max(0, Math.min(1, Number(artistFatigue[key]) || 0));
  }
  return 0;
};

const fallbackNoise = (track, salt = '') => (stableHash(`${idOf(track)}:${salt}`) % 100) / 100;
const INTENT_RANDOM_WEIGHT = 14;
const MOOD_SAMPLE_TEMPERATURE = 6;

const weightedSampleWithoutReplacement = (
  rows = [],
  {
    count = 0,
    temperature = MOOD_SAMPLE_TEMPERATURE,
    random = Math.random,
  } = {},
) => {
  if (!Array.isArray(rows) || rows.length === 0 || count <= 0) return [];
  const temp = Number.isFinite(temperature) && temperature > 0 ? temperature : MOOD_SAMPLE_TEMPERATURE;
  const rng = typeof random === 'function' ? random : Math.random;
  const pool = rows.filter((row) => Number.isFinite(row?.score));
  const out = [];

  while (pool.length > 0 && out.length < count) {
    let maxScore = -Infinity;
    for (const row of pool) {
      if (row.score > maxScore) maxScore = row.score;
    }

    let totalWeight = 0;
    const weights = pool.map((row) => {
      const weight = Math.exp((row.score - maxScore) / temp);
      totalWeight += weight;
      return weight;
    });
    if (totalWeight <= 0) break;

    let cursor = rng() * totalWeight;
    let selectedIndex = weights.length - 1;
    for (let index = 0; index < weights.length; index += 1) {
      cursor -= weights[index];
      if (cursor <= 0) {
        selectedIndex = index;
        break;
      }
    }
    out.push(pool[selectedIndex]);
    pool.splice(selectedIndex, 1);
  }

  return out;
};

const pushUnique = (out, rows, limit, seen) => {
  for (const row of rows) {
    if (out.length >= limit) break;
    const key = idOf(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
};

const pickBlended = (
  ranked,
  {
    count = 12,
    minFresh = 0,
    minClassic = 0,
  } = {},
) => {
  const seen = new Set();
  const out = [];
  const fresh = ranked.filter((track) => isFreshTrack(track));
  const classic = ranked.filter((track) => isClassicTrack(track));

  pushUnique(out, fresh, minFresh, seen);
  pushUnique(out, classic, minFresh + minClassic, seen);
  pushUnique(out, ranked, count, seen);
  return out.slice(0, count);
};

export const diversifyTracks = (
  rows,
  {
    count = 12,
    maxPerArtist = 2,
  } = {},
) => {
  const artistCount = new Map();
  const seen = new Set();
  const primary = [];
  const deferred = [];

  for (const track of rows || []) {
    const key = idOf(track);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const artistKey = artistKeyOf(track);
    const used = artistCount.get(artistKey) || 0;
    if (artistKey && used >= maxPerArtist) {
      deferred.push(track);
      continue;
    }
    primary.push(track);
    if (artistKey) artistCount.set(artistKey, used + 1);
    if (primary.length >= count) return primary.slice(0, count);
  }

  for (const track of deferred) {
    if (primary.length >= count) break;
    primary.push(track);
  }
  return primary.slice(0, count);
};

export const isColdStartUser = ({
  history = [],
  favorites = [],
} = {}) => history.length === 0 && favorites.length === 0;

const sanitizeTasteSeed = (value) => {
  if (!value || typeof value !== 'object') return null;
  const moodId = typeof value.moodId === 'string' && value.moodId ? value.moodId : null;
  const genreId = typeof value.genreId === 'string' && value.genreId ? value.genreId : null;
  const anchorArtist =
    typeof value.anchorArtist === 'string' && value.anchorArtist ? value.anchorArtist : null;
  if (!moodId && !genreId && !anchorArtist) return null;
  return {
    moodId,
    genreId,
    anchorArtist,
    ts: Number.isFinite(value.ts) ? value.ts : Date.now(),
  };
};

export const readExploreTasteSeed = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(EXPLORE_TASTE_SEED_KEY);
    if (!raw) return null;
    return sanitizeTasteSeed(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const writeExploreTasteSeed = (seed) => {
  if (typeof window === 'undefined') return;
  try {
    if (!seed) {
      window.localStorage.removeItem(EXPLORE_TASTE_SEED_KEY);
      return;
    }
    window.localStorage.setItem(EXPLORE_TASTE_SEED_KEY, JSON.stringify(seed));
  } catch {
    /* storage unavailable */
  }
};

export const mergeExploreTasteSeed = (previous, patch = {}) => {
  const base = sanitizeTasteSeed(previous) || {};
  const next = {
    moodId:
      patch.moodId === undefined
        ? (base.moodId || null)
        : (patch.moodId || null),
    genreId:
      patch.genreId === undefined
        ? (base.genreId || null)
        : (patch.genreId || null),
    anchorArtist:
      patch.anchorArtist === undefined
        ? (base.anchorArtist || null)
        : (patch.anchorArtist || null),
    ts: Date.now(),
  };
  return sanitizeTasteSeed(next);
};

const sanitizeFeedbackCounts = (value) => {
  const base = value && typeof value === 'object' ? value : {};
  return {
    play: Number.isFinite(base.play) ? Math.max(0, Math.round(base.play)) : 0,
    save: Number.isFinite(base.save) ? Math.max(0, Math.round(base.save)) : 0,
    skip: Number.isFinite(base.skip) ? Math.max(0, Math.round(base.skip)) : 0,
  };
};

const sanitizeFeedbackEvents = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((event) => {
      const type = ['play', 'save', 'skip'].includes(event?.type) ? event.type : null;
      const trackId = stringOrNull(event?.trackId);
      if (!type || !trackId) return null;
      return {
        type,
        trackId,
        moodId: stringOrNull(event?.moodId),
        genreId: stringOrNull(event?.genreId),
        ts: Number.isFinite(event?.ts) ? event.ts : Date.now(),
      };
    })
    .filter(Boolean)
    .slice(0, MAX_FEEDBACK_EVENTS);
};

const sanitizeTrackIdList = (value) => {
  if (!Array.isArray(value)) return [];
  return dedupeStrings(
    value.map((entry) => stringOrNull(entry)).filter(Boolean),
  ).slice(0, MAX_TRACK_FEEDBACK);
};

const sanitizeTasteProfile = (value) => {
  if (!value || typeof value !== 'object') return null;
  const moodId = stringOrNull(value.moodId);
  const energyId = stringOrNull(value.energyId);
  const activityId = stringOrNull(value.activityId);
  const likedTrackIds = sanitizeTrackIdList(value.likedTrackIds);
  const skippedTrackIds = sanitizeTrackIdList(value.skippedTrackIds);
  const feedback = sanitizeFeedbackCounts(value.feedback);
  const recentEvents = sanitizeFeedbackEvents(value.recentEvents);
  const onboardingComplete = Boolean(value.onboardingComplete);
  if (
    !moodId
    && !energyId
    && !activityId
    && likedTrackIds.length === 0
    && skippedTrackIds.length === 0
    && recentEvents.length === 0
    && feedback.play === 0
    && feedback.save === 0
    && feedback.skip === 0
    && !onboardingComplete
  ) {
    return null;
  }
  return {
    moodId,
    energyId,
    activityId,
    likedTrackIds,
    skippedTrackIds,
    feedback,
    recentEvents,
    onboardingComplete,
    updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : Date.now(),
  };
};

export const readExploreTasteProfile = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(EXPLORE_TASTE_PROFILE_KEY);
    if (!raw) return null;
    return sanitizeTasteProfile(JSON.parse(raw));
  } catch {
    return null;
  }
};

export const writeExploreTasteProfile = (profile) => {
  if (typeof window === 'undefined') return;
  try {
    if (!profile) {
      window.localStorage.removeItem(EXPLORE_TASTE_PROFILE_KEY);
      return;
    }
    window.localStorage.setItem(EXPLORE_TASTE_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    /* storage unavailable */
  }
};

export const mergeExploreTasteProfile = (previous, patch = {}) => {
  const base = sanitizeTasteProfile(previous) || {};
  const next = {
    moodId:
      patch.moodId === undefined
        ? (base.moodId || null)
        : (patch.moodId || null),
    energyId:
      patch.energyId === undefined
        ? (base.energyId || null)
        : (patch.energyId || null),
    activityId:
      patch.activityId === undefined
        ? (base.activityId || null)
        : (patch.activityId || null),
    likedTrackIds:
      patch.likedTrackIds === undefined
        ? (base.likedTrackIds || [])
        : patch.likedTrackIds,
    skippedTrackIds:
      patch.skippedTrackIds === undefined
        ? (base.skippedTrackIds || [])
        : patch.skippedTrackIds,
    feedback:
      patch.feedback === undefined
        ? sanitizeFeedbackCounts(base.feedback)
        : sanitizeFeedbackCounts(patch.feedback),
    recentEvents:
      patch.recentEvents === undefined
        ? (base.recentEvents || [])
        : patch.recentEvents,
    onboardingComplete:
      patch.onboardingComplete === undefined
        ? Boolean(base.onboardingComplete)
        : Boolean(patch.onboardingComplete),
    updatedAt: Date.now(),
  };
  return sanitizeTasteProfile(next);
};

export const recordExploreFeedback = (previousProfile, event = {}) => {
  const base = sanitizeTasteProfile(previousProfile)
    || {
      moodId: null,
      energyId: null,
      activityId: null,
      likedTrackIds: [],
      skippedTrackIds: [],
      feedback: { play: 0, save: 0, skip: 0 },
      recentEvents: [],
      onboardingComplete: false,
      updatedAt: Date.now(),
    };

  const eventType = ['play', 'save', 'skip'].includes(event.type) ? event.type : 'play';
  const trackId = idOf(event.track || { id: event.trackId });
  const likedSet = new Set(base.likedTrackIds || []);
  const skippedSet = new Set(base.skippedTrackIds || []);

  if (trackId) {
    if (eventType === 'save') {
      likedSet.add(trackId);
      skippedSet.delete(trackId);
    }
    if (eventType === 'skip') {
      skippedSet.add(trackId);
      likedSet.delete(trackId);
    }
  }

  const next = {
    ...base,
    moodId: event.moodId === undefined ? base.moodId : (event.moodId || null),
    energyId: event.energyId === undefined ? base.energyId : (event.energyId || null),
    activityId: event.activityId === undefined ? base.activityId : (event.activityId || null),
    likedTrackIds: Array.from(likedSet).slice(0, MAX_TRACK_FEEDBACK),
    skippedTrackIds: Array.from(skippedSet).slice(0, MAX_TRACK_FEEDBACK),
    feedback: {
      ...base.feedback,
      [eventType]: (base.feedback[eventType] || 0) + 1,
    },
    recentEvents: [
      {
        type: eventType,
        trackId: trackId || null,
        moodId: event.moodId || base.moodId || null,
        genreId: event.genreId || null,
        ts: Date.now(),
      },
      ...(base.recentEvents || []),
    ].slice(0, MAX_FEEDBACK_EVENTS),
    updatedAt: Date.now(),
  };
  return sanitizeTasteProfile(next);
};

export const mapSearchMoodToExploreMood = (value) =>
  SEARCH_TO_EXPLORE_MOOD[normalize(value)] || null;

export const inferMoodFromActivity = (activityId) =>
  ACTIVITY_TO_MOOD[normalize(activityId)] || null;

export const inferMoodFromEnergy = (energyId) =>
  ENERGY_TO_MOOD[normalize(energyId)] || null;

export const resolveExploreMoodId = ({
  moodId = null,
  searchMood = null,
  activityId = null,
  energyId = null,
} = {}) => {
  const validMoodIds = new Set(EXPLORE_MOODS.map((entry) => entry.id));
  const direct = stringOrNull(moodId);
  if (direct && validMoodIds.has(direct)) return direct;
  const fromSearch = mapSearchMoodToExploreMood(searchMood);
  if (fromSearch && validMoodIds.has(fromSearch)) return fromSearch;
  const fromActivity = inferMoodFromActivity(activityId);
  if (fromActivity && validMoodIds.has(fromActivity)) return fromActivity;
  const fromEnergy = inferMoodFromEnergy(energyId);
  if (fromEnergy && validMoodIds.has(fromEnergy)) return fromEnergy;
  return null;
};

export const buildOnboardingTastePatch = ({
  moodId = null,
  searchMood = null,
  energyId = null,
  activityId = null,
} = {}) => {
  const resolvedMoodId = resolveExploreMoodId({
    moodId,
    searchMood,
    energyId,
    activityId,
  });
  return {
    moodId: resolvedMoodId,
    energyId: stringOrNull(energyId),
    activityId: stringOrNull(activityId),
  };
};

export const buildArtistAffinity = ({
  history = [],
  favorites = [],
  followedArtists = [],
} = {}) => {
  const map = new Map();
  const add = (artistName, score) => {
    const key = normalize(artistName);
    if (!key || score <= 0) return;
    map.set(key, (map.get(key) || 0) + score);
  };

  favorites.slice(0, 60).forEach((track, index) => {
    add(track?.artist, Math.max(1, 14 - index * 0.18));
  });
  history.slice(0, 80).forEach((track, index) => {
    add(track?.artist, Math.max(1, 8 - index * 0.08));
  });
  followedArtists.slice(0, 30).forEach((artist, index) => {
    add(artist?.name || artist?.slug, Math.max(2, 6 - index * 0.1));
  });
  return map;
};

export const buildCandidatePool = ({
  trending = [],
  chartsFresh = [],
  chartsClassic = [],
  freshPool = [],
  history = [],
  favorites = [],
} = {}) => {
  const taggedSources = [
    ['discovery', sanitizeTrackList(freshPool, { requirePlayable: true })],
    ['trending', sanitizeTrackList(trending, { requirePlayable: true })],
    ['chartsFresh', sanitizeTrackList(chartsFresh, { requirePlayable: true })],
    ['chartsClassic', sanitizeTrackList(chartsClassic, { requirePlayable: true })],
    ['favorite', sanitizeTrackList(favorites, { requirePlayable: true })],
    ['history', sanitizeTrackList(history, { requirePlayable: true })],
  ];

  const pool = new Map();
  for (const [source, rows] of taggedSources) {
    rows.forEach((track, index) => {
      const key = idOf(track);
      if (!key) return;
      const existing = pool.get(key);
      if (!existing) {
        pool.set(key, {
          ...track,
          _sources: [source],
          _sourceRank: index,
          _freshness: SOURCE_FRESHNESS[source] || 0.5,
          _sourceWeight: SOURCE_WEIGHT[source] || 0.5,
        });
        return;
      }
      const sources = dedupeStrings([...existing._sources, source]);
      const nextThumb =
        sanitizeImageUrl(existing.thumbnail, { fallback: null })
        || sanitizeImageUrl(track.thumbnail, { fallback: null });
      pool.set(key, {
        ...existing,
        ...track,
        thumbnail: nextThumb || pickPlaceholder('track'),
        _sources: sources,
        _sourceRank: Math.min(existing._sourceRank, index),
        _freshness: Math.max(existing._freshness, SOURCE_FRESHNESS[source] || 0.5),
        _sourceWeight: Math.max(existing._sourceWeight, SOURCE_WEIGHT[source] || 0.5),
      });
    });
  }

  return Array.from(pool.values()).sort((a, b) => {
    if (b._sourceWeight !== a._sourceWeight) return b._sourceWeight - a._sourceWeight;
    if (a._sourceRank !== b._sourceRank) return a._sourceRank - b._sourceRank;
    return (a.title || '').localeCompare(b.title || '');
  });
};

const activityKeywordsFor = (activityId) =>
  ACTIVITY_BY_ID[normalize(activityId)]?.keywords || [];

const energyKeywordsFor = (energyId) =>
  ENERGY_BY_ID[normalize(energyId)]?.keywords || [];

const moodById = (moodId) => EXPLORE_MOODS.find((entry) => entry.id === moodId) || null;

const profileKeywords = (tasteProfile) =>
  dedupeStrings([
    ...energyKeywordsFor(tasteProfile?.energyId),
    ...activityKeywordsFor(tasteProfile?.activityId),
    ...(moodById(tasteProfile?.moodId)?.keywords || []),
  ]);

const scoreForIntent = ({
  track,
  keywords = [],
  affinity,
  consumedIds,
  likedIds = new Set(),
  skippedIds = new Set(),
  salt = '',
  extraScore = 0,
  randomFn = null,
  randomWeight = INTENT_RANDOM_WEIGHT,
  artistFatigue = null,
}) => {
  const id = idOf(track);
  const artistAffinity = affinity.get(artistKeyOf(track)) || 0;
  const fatiguePenalty = resolveArtistFatigue(artistFatigue, track) * 12;
  const novelty = consumedIds.has(id) ? -8 : 9;
  const likedBonus = likedIds.has(id) ? 11 : 0;
  const skippedPenalty = skippedIds.has(id) ? -18 : 0;
  const matches = keywordHits(track, keywords);
  const freshness = (track._freshness || 0.5) * 18;
  const classicBonus = isClassicTrack(track) ? 4 : 0;
  const freshBonus = isFreshTrack(track) ? 7 : 0;
  const randomNoise = typeof randomFn === 'function'
    ? (Math.max(0, Number(randomFn(track)) || 0) * randomWeight)
    : fallbackNoise(track, salt);
  return (
    matches * 26
    + artistAffinity * 1.65
    + novelty
    + likedBonus
    + skippedPenalty
    + freshness
    + classicBonus
    + freshBonus
    + extraScore
    + randomNoise
    - fatiguePenalty
  );
};

export const buildMoodQueue = ({
  mood,
  pool = [],
  history = [],
  favorites = [],
  followedArtists = [],
  tasteSeed = null,
  tasteProfile = null,
  count = 12,
  seed = null,
  excludeIds = null,
  sampleTopK = null,
  artistFatigue = null,
} = {}) => {
  if (!mood || !Array.isArray(pool) || pool.length === 0) return [];
  const excludeSet = normalizeExcludeSet(excludeIds);
  const filteredPool = excludeSet.size
    ? pool.filter((track) => !excludeSet.has(idOf(track)))
    : pool;
  if (!filteredPool.length) return [];

  const affinity = buildArtistAffinity({ history, favorites, followedArtists });
  const consumedIds = buildConsumedIdSet({ history, favorites });
  const likedIds = new Set(tasteProfile?.likedTrackIds || []);
  const skippedIds = new Set(tasteProfile?.skippedTrackIds || []);
  const seedArtist = normalize(tasteSeed?.anchorArtist || '');
  const moodBoost = tasteSeed?.moodId === mood.id ? 6 : 0;
  const queueSeed = seed == null ? '' : String(seed);
  const hasCustomSeed = Boolean(queueSeed);
  const trackRandomFn = hasCustomSeed ? seededTrackRandom(`${mood.id}:${queueSeed}`) : null;
  const shouldUseSampledTopK =
    hasCustomSeed
    || excludeSet.size > 0
    || (Number.isFinite(sampleTopK) && sampleTopK > 0);
  const keywords = dedupeStrings([
    ...mood.keywords,
    ...tokenize(mood.label),
    ...profileKeywords(tasteProfile),
  ]);

  const rankedWithScores = filteredPool.map((track) => ({
    track,
    score: scoreForIntent({
      track,
      keywords,
      affinity,
      consumedIds,
      likedIds,
      skippedIds,
      salt: mood.id,
      extraScore:
        moodBoost
        + (seedArtist && artistKeyOf(track) === seedArtist ? 10 : 0),
      randomFn: trackRandomFn,
      artistFatigue,
    }),
  })).sort((a, b) => b.score - a.score);

  let ranked = rankedWithScores.map((row) => row.track);
  if (shouldUseSampledTopK) {
    const topK = Math.max(
      count,
      Number.isFinite(sampleTopK) && sampleTopK > 0 ? Math.floor(sampleTopK) : Math.max(count * 3, 48),
    );
    const topRows = rankedWithScores.slice(0, topK);
    const sampledRows = weightedSampleWithoutReplacement(topRows, {
      count: Math.min(topRows.length, Math.max(count, Math.ceil(count * 1.5))),
      temperature: MOOD_SAMPLE_TEMPERATURE,
      random: mulberry32(stableHash(`${mood.id}:${queueSeed || 'default'}:sample`)),
    });
    if (sampledRows.length) ranked = sampledRows.map((row) => row.track);
  }

  const blended = pickBlended(ranked, {
    count,
    minFresh: Math.ceil(count * 0.5),
    minClassic: Math.max(1, Math.floor(count * 0.25)),
  });
  return diversifyTracks(blended, { count, maxPerArtist: 2 });
};

export const buildGenreQueue = ({
  genre,
  pool = [],
  history = [],
  favorites = [],
  followedArtists = [],
  tasteSeed = null,
  tasteProfile = null,
  count = 12,
  seed = null,
  excludeIds = null,
  artistFatigue = null,
} = {}) => {
  if (!genre || !Array.isArray(pool) || pool.length === 0) return [];
  const excludeSet = normalizeExcludeSet(excludeIds);
  const filteredPool = excludeSet.size
    ? pool.filter((track) => !excludeSet.has(idOf(track)))
    : pool;
  if (!filteredPool.length) return [];
  const affinity = buildArtistAffinity({ history, favorites, followedArtists });
  const consumedIds = buildConsumedIdSet({ history, favorites });
  const likedIds = new Set(tasteProfile?.likedTrackIds || []);
  const skippedIds = new Set(tasteProfile?.skippedTrackIds || []);
  const queueSeed = seed == null ? '' : String(seed);
  const trackRandomFn = queueSeed ? seededTrackRandom(`${genre.id}:${queueSeed}`) : null;
  const genreTokens = dedupeStrings([
    genre.label,
    ...tokenize(genre.label),
    ...tokenize(genre.sampleTrack?.title || ''),
    ...tokenize(genre.sampleTrack?.artist || ''),
    ...profileKeywords(tasteProfile),
  ]);
  const boost = tasteSeed?.genreId === genre.id ? 7 : 0;

  const ranked = [...filteredPool].sort((a, b) => {
    const scoreA = scoreForIntent({
      track: a,
      keywords: genreTokens,
      affinity,
      consumedIds,
      likedIds,
      skippedIds,
      salt: genre.id,
      extraScore: boost,
      randomFn: trackRandomFn,
      artistFatigue,
    });
    const scoreB = scoreForIntent({
      track: b,
      keywords: genreTokens,
      affinity,
      consumedIds,
      likedIds,
      skippedIds,
      salt: genre.id,
      extraScore: boost,
      randomFn: trackRandomFn,
      artistFatigue,
    });
    return scoreB - scoreA;
  });

  const blended = pickBlended(ranked, {
    count,
    minFresh: Math.ceil(count * 0.45),
    minClassic: Math.max(1, Math.floor(count * 0.3)),
  });
  const queue = diversifyTracks(blended, { count, maxPerArtist: 2 });

  const sample = sanitizeTrackList([genre.sampleTrack], { requirePlayable: true })[0];
  if (!sample) return queue;
  return dedupeTracks([sample, ...queue]).slice(0, count);
};

export const buildBecauseList = ({
  lastLiked,
  pool = [],
  history = [],
  favorites = [],
  followedArtists = [],
  tasteProfile = null,
  max = 4,
  seed = null,
  excludeIds = null,
  artistFatigue = null,
} = {}) => {
  if (!lastLiked || !Array.isArray(pool) || pool.length === 0) return [];
  const excludeSet = normalizeExcludeSet(excludeIds);
  const filteredPool = excludeSet.size
    ? pool.filter((track) => !excludeSet.has(idOf(track)))
    : pool;
  if (!filteredPool.length) return [];

  const affinity = buildArtistAffinity({ history, favorites, followedArtists });
  const consumedIds = buildConsumedIdSet({ history, favorites });
  const likedIds = new Set(tasteProfile?.likedTrackIds || []);
  const skippedIds = new Set(tasteProfile?.skippedTrackIds || []);
  const likedId = idOf(lastLiked);
  const likedArtist = normalize(lastLiked.artist);
  const likedTitleTokens = tokenize(lastLiked.title);
  const likedGenres = Array.isArray(lastLiked.genre) ? lastLiked.genre : [];
  const queueSeed = seed == null ? '' : String(seed);
  const trackRandomFn = queueSeed ? seededTrackRandom(`because:${likedId}:${queueSeed}`) : null;

  const ranked = filteredPool
    .filter((track) => idOf(track) !== likedId)
    .sort((a, b) => {
      const artistA = normalize(a.artist);
      const artistB = normalize(b.artist);
      const tagsA = Array.isArray(a.genre) ? a.genre : [];
      const tagsB = Array.isArray(b.genre) ? b.genre : [];

      const scoreA = scoreForIntent({
        track: a,
        keywords: likedTitleTokens,
        affinity,
        consumedIds,
        likedIds,
        skippedIds,
        salt: likedId,
        randomFn: trackRandomFn,
        artistFatigue,
        extraScore:
          (artistA && artistA === likedArtist ? 120 : 0)
          + overlapCount(tagsA, likedGenres) * 22,
      });
      const scoreB = scoreForIntent({
        track: b,
        keywords: likedTitleTokens,
        affinity,
        consumedIds,
        likedIds,
        skippedIds,
        salt: likedId,
        randomFn: trackRandomFn,
        artistFatigue,
        extraScore:
          (artistB && artistB === likedArtist ? 120 : 0)
          + overlapCount(tagsB, likedGenres) * 22,
      });
      return scoreB - scoreA;
    });

  const blended = pickBlended(ranked, { count: max, minFresh: 1, minClassic: 1 });
  return diversifyTracks(blended, { count: max, maxPerArtist: 2 });
};

const weightedRandomPick = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const total = rows.reduce((sum, row) => sum + Math.max(0, Number(row.weight) || 0), 0);
  if (total <= 0) return rows[0]?.item || null;
  const target = Math.random() * total;
  let cursor = 0;
  for (const row of rows) {
    cursor += Math.max(0, Number(row.weight) || 0);
    if (cursor >= target) return row.item || null;
  }
  return rows[rows.length - 1]?.item || null;
};

export const buildHiddenGems = ({
  pool = [],
  history = [],
  favorites = [],
  followedArtists = [],
  tasteProfile = null,
  count = 12,
  seed = null,
  excludeIds = null,
  artistFatigue = null,
} = {}) => {
  if (!Array.isArray(pool) || pool.length === 0) return [];
  const excludeSet = normalizeExcludeSet(excludeIds);
  const filteredPool = excludeSet.size
    ? pool.filter((track) => !excludeSet.has(idOf(track)))
    : pool;
  if (!filteredPool.length) return [];
  const affinity = buildArtistAffinity({ history, favorites, followedArtists });
  const consumedIds = buildConsumedIdSet({ history, favorites });
  const likedIds = new Set(tasteProfile?.likedTrackIds || []);
  const skippedIds = new Set(tasteProfile?.skippedTrackIds || []);
  const keywords = profileKeywords(tasteProfile);
  const queueSeed = seed == null ? '' : String(seed);
  const trackRandomFn = queueSeed ? seededTrackRandom(`hidden:${queueSeed}`) : null;

  const ranked = [...filteredPool]
    .filter((track) => !skippedIds.has(idOf(track)))
    .sort((a, b) => {
      const scoreA = scoreForIntent({
        track: a,
        keywords,
        affinity,
        consumedIds,
        likedIds,
        skippedIds,
        salt: 'hidden-gems',
        randomFn: trackRandomFn,
        artistFatigue,
        extraScore:
          (isFreshTrack(a) ? -11 : 6)
          + (isClassicTrack(a) ? 4 : 0)
          + (1 - (a?._sourceWeight || 0.5)) * 18,
      });
      const scoreB = scoreForIntent({
        track: b,
        keywords,
        affinity,
        consumedIds,
        likedIds,
        skippedIds,
        salt: 'hidden-gems',
        randomFn: trackRandomFn,
        artistFatigue,
        extraScore:
          (isFreshTrack(b) ? -11 : 6)
          + (isClassicTrack(b) ? 4 : 0)
          + (1 - (b?._sourceWeight || 0.5)) * 18,
      });
      return scoreB - scoreA;
    });
  return diversifyTracks(ranked, { count, maxPerArtist: 1 });
};

export const pickSurpriseTrack = ({
  pool = [],
  history = [],
  favorites = [],
  followedArtists = [],
  tasteSeed = null,
  tasteProfile = null,
  mood = null,
  seed = null,
  excludeIds = null,
  artistFatigue = null,
} = {}) => {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  const excludeSet = normalizeExcludeSet(excludeIds);
  const filteredPool = excludeSet.size
    ? pool.filter((track) => !excludeSet.has(idOf(track)))
    : pool;
  if (!filteredPool.length) return null;
  const activeMood = mood || moodById(tasteSeed?.moodId) || moodById(tasteProfile?.moodId);
  const affinity = buildArtistAffinity({ history, favorites, followedArtists });
  const consumedIds = buildConsumedIdSet({ history, favorites });
  const likedIds = new Set(tasteProfile?.likedTrackIds || []);
  const skippedIds = new Set(tasteProfile?.skippedTrackIds || []);
  const seedArtist = normalize(tasteSeed?.anchorArtist || '');
  const keywords = dedupeStrings([
    ...(activeMood?.keywords || []),
    ...profileKeywords(tasteProfile),
  ]);
  const queueSeed = seed == null ? '' : String(seed);
  const trackRandomFn = queueSeed ? seededTrackRandom(`surprise:${queueSeed}`) : null;

  const ranked = [...filteredPool]
    .filter((track) => !skippedIds.has(idOf(track)))
    .sort((a, b) => {
      const scoreA = scoreForIntent({
        track: a,
        keywords,
        affinity,
        consumedIds,
        likedIds,
        skippedIds,
        salt: 'surprise',
        randomFn: trackRandomFn,
        artistFatigue,
        extraScore:
          (seedArtist && artistKeyOf(a) === seedArtist ? 8 : 0)
          + (consumedIds.has(idOf(a)) ? -18 : 12),
      });
      const scoreB = scoreForIntent({
        track: b,
        keywords,
        affinity,
        consumedIds,
        likedIds,
        skippedIds,
        salt: 'surprise',
        randomFn: trackRandomFn,
        artistFatigue,
        extraScore:
          (seedArtist && artistKeyOf(b) === seedArtist ? 8 : 0)
          + (consumedIds.has(idOf(b)) ? -18 : 12),
      });
      return scoreB - scoreA;
    });
  const shortlist = diversifyTracks(ranked.slice(0, 28), { count: 12, maxPerArtist: 1 });
  const weighted = shortlist.map((item, index) => ({
    item,
    weight: Math.max(1, 24 - index * 1.5),
  }));
  return weightedRandomPick(weighted);
};

export const buildJourneyQueue = ({
  journey = null,
  pool = [],
  history = [],
  favorites = [],
  followedArtists = [],
  tasteSeed = null,
  tasteProfile = null,
  count = 12,
  seed = null,
  excludeIds = null,
  artistFatigue = null,
} = {}) => {
  if (!journey || !Array.isArray(pool) || pool.length === 0) return [];
  const excludeSet = normalizeExcludeSet(excludeIds);
  const filteredPool = excludeSet.size
    ? pool.filter((track) => !excludeSet.has(idOf(track)))
    : pool;
  if (!filteredPool.length) return [];
  const affinity = buildArtistAffinity({ history, favorites, followedArtists });
  const consumedIds = buildConsumedIdSet({ history, favorites });
  const likedIds = new Set(tasteProfile?.likedTrackIds || []);
  const skippedIds = new Set(tasteProfile?.skippedTrackIds || []);
  const keywords = dedupeStrings([
    ...(journey.keywords || []),
    ...tokenize(journey.title || ''),
    ...profileKeywords(tasteProfile),
  ]);
  const moodBoost = journey.moodId && journey.moodId === tasteSeed?.moodId ? 7 : 0;
  const queueSeed = seed == null ? '' : String(seed);
  const trackRandomFn = queueSeed ? seededTrackRandom(`journey:${journey.id || 'x'}:${queueSeed}`) : null;

  const ranked = [...filteredPool]
    .filter((track) => !skippedIds.has(idOf(track)))
    .sort((a, b) => {
      const scoreA = scoreForIntent({
        track: a,
        keywords,
        affinity,
        consumedIds,
        likedIds,
        skippedIds,
        salt: `journey:${journey.id || 'x'}`,
        randomFn: trackRandomFn,
        artistFatigue,
        extraScore:
          moodBoost
          + (journey.preferHidden && isFreshTrack(a) ? -7 : 0)
          + (journey.preferHidden && isClassicTrack(a) ? 4 : 0),
      });
      const scoreB = scoreForIntent({
        track: b,
        keywords,
        affinity,
        consumedIds,
        likedIds,
        skippedIds,
        salt: `journey:${journey.id || 'x'}`,
        randomFn: trackRandomFn,
        artistFatigue,
        extraScore:
          moodBoost
          + (journey.preferHidden && isFreshTrack(b) ? -7 : 0)
          + (journey.preferHidden && isClassicTrack(b) ? 4 : 0),
      });
      return scoreB - scoreA;
    });
  return diversifyTracks(ranked, { count, maxPerArtist: 2 });
};

const topArtistsFromSignals = ({
  history = [],
  favorites = [],
  followedArtists = [],
}) => {
  const affinity = buildArtistAffinity({ history, favorites, followedArtists });
  const names = new Map();
  [...favorites, ...history].forEach((track) => {
    const key = normalize(track?.artist);
    if (!key || names.has(key)) return;
    names.set(key, track.artist);
  });
  followedArtists.forEach((artist) => {
    const key = normalize(artist?.name || artist?.slug);
    if (!key || names.has(key)) return;
    names.set(key, artist.name || artist.slug);
  });
  return Array.from(affinity.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => ({ key, artist: names.get(key) || key }))
    .slice(0, 24);
};

export const buildDailyMixes = ({
  history = [],
  favorites = [],
  followedArtists = [],
  genres = [],
  pool = [],
  tasteSeed = null,
  tasteProfile = null,
  max = 6,
  seed = null,
  excludeIds = null,
  artistFatigue = null,
} = {}) => {
  const fallbackThumbnail = pickPlaceholder('daily-mix');
  const excludeSet = normalizeExcludeSet(excludeIds);
  const filteredPool = excludeSet.size
    ? pool.filter((track) => !excludeSet.has(idOf(track)))
    : pool;
  const queueSeed = seed == null ? '' : String(seed);
  const seededArtists = topArtistsFromSignals({ history, favorites, followedArtists });
  const localPlayable = sanitizeTrackList([...favorites, ...history], { requirePlayable: true });
  const localEligible = excludeSet.size
    ? localPlayable.filter((track) => !excludeSet.has(idOf(track)))
    : localPlayable;

  if (seededArtists.length > 0) {
    return seededArtists.slice(0, max).map((entry, index) => {
      const local = localEligible.filter((track) => normalize(track.artist) === entry.key);
      const candidate = filteredPool.filter((track) => normalize(track.artist) === entry.key);
      const seedTracks = diversifyTracks(
        dedupeTracks([...local, ...candidate]),
        { count: 18, maxPerArtist: 3 },
      );
      const sample = seedTracks[0] || local[0] || candidate[0];
      return {
        id: `dm-artist-${entry.key}`,
        label: `Daily Mix ${String(index + 1).padStart(2, '0')}`,
        artist: entry.artist,
        artistSlug: sample?.artistSlug || null,
        thumbnail: sanitizeImageUrl(sample?.thumbnail, { fallback: fallbackThumbnail }),
        seedTracks,
        source: 'artist',
      };
    });
  }

  const moodHints = MOOD_GENRE_HINTS[tasteProfile?.moodId || tasteSeed?.moodId] || [];
  const rankedGenres = [...(genres || [])].sort((a, b) => {
    if (tasteSeed?.genreId === a.id) return -1;
    if (tasteSeed?.genreId === b.id) return 1;
    const aScore = moodHints.some((token) => normalize(a.label).includes(normalize(token))) ? 1 : 0;
    const bScore = moodHints.some((token) => normalize(b.label).includes(normalize(token))) ? 1 : 0;
    return bScore - aScore;
  });

  const genreMixes = rankedGenres.slice(0, max).map((genre, index) => {
    const seedTracks = buildGenreQueue({
      genre,
      pool,
      history,
      favorites,
      followedArtists,
      tasteSeed,
      tasteProfile,
      count: 18,
      seed: queueSeed ? `${queueSeed}:${genre.id}` : null,
      excludeIds: excludeSet,
      artistFatigue,
    });
    const sample = seedTracks[0] || sanitizeTrackList([genre.sampleTrack], { requirePlayable: true })[0];
    return {
      id: `dm-genre-${genre.id}`,
      label: `Daily Mix ${String(index + 1).padStart(2, '0')}`,
      artist: genre.label,
      genreId: genre.id,
      thumbnail: sanitizeImageUrl(genre.thumbnail || sample?.thumbnail, {
        fallback: fallbackThumbnail,
      }),
      seedTracks,
      source: 'genre',
    };
  });

  if (genreMixes.length > 0) return genreMixes;

  const fallback = diversifyTracks(filteredPool, { count: max * 3, maxPerArtist: 2 });
  const byArtist = new Map();
  for (const track of fallback) {
    const key = artistKeyOf(track);
    if (!key) continue;
    const existing = byArtist.get(key) || [];
    existing.push(track);
    byArtist.set(key, existing);
    if (byArtist.size >= max) break;
  }
  return Array.from(byArtist.entries()).map(([artistKey, tracks], index) => ({
    id: `dm-fallback-${artistKey}`,
    label: `Daily Mix ${String(index + 1).padStart(2, '0')}`,
    artist: tracks[0]?.artist || 'Unknown artist',
    thumbnail: sanitizeImageUrl(tracks[0]?.thumbnail, { fallback: fallbackThumbnail }),
    seedTracks: tracks.slice(0, 18),
    source: 'fallback',
  }));
};

export default {
  EXPLORE_MOODS,
  EXPLORE_ENERGY_LEVELS,
  EXPLORE_ACTIVITIES,
  isColdStartUser,
  buildCandidatePool,
  buildDailyMixes,
  buildMoodQueue,
  buildGenreQueue,
  buildBecauseList,
  buildHiddenGems,
  pickSurpriseTrack,
  buildJourneyQueue,
  buildOnboardingTastePatch,
  resolveExploreMoodId,
  mapSearchMoodToExploreMood,
  buildArtistAffinity,
  readExploreTasteSeed,
  writeExploreTasteSeed,
  mergeExploreTasteSeed,
  readExploreTasteProfile,
  writeExploreTasteProfile,
  mergeExploreTasteProfile,
  recordExploreFeedback,
};
