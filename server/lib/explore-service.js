const { randomInt } = require('crypto');
const ytm = require('./ytmusic');
const lastfm = require('./lastfm');
const { fetchRealChartData } = require('./charts-service');
const { toTrackDTO } = require('./mappers');
const defaultDeps = {
  ytm,
  lastfm,
  fetchRealChartData,
  toTrackDTO,
};
const deps = { ...defaultDeps };

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const CACHE_MAX_ENTRIES = toPositiveInt(process.env.EXPLORE_CACHE_MAX_ENTRIES, 300);
const PULSE_TTL_MS = toPositiveInt(process.env.EXPLORE_PULSE_TTL_MS, 120_000);
const RADIO_TTL_MS = toPositiveInt(process.env.EXPLORE_RADIO_TTL_MS, 90_000);
const SIMILAR_TTL_MS = toPositiveInt(process.env.EXPLORE_SIMILAR_TTL_MS, 5 * 60_000);
const JOURNEY_TTL_MS = toPositiveInt(process.env.EXPLORE_JOURNEY_TTL_MS, 3 * 60_000);
const RADIO_DIVERSITY_DEFAULT = 'default';
const RADIO_DIVERSITY_HIGH = 'high';
const DIVERSITY_DECADE_HINTS = ['70s', '80s', '90s', '2000s', '2010s', '2020s'];

const cache = new Map();
const inflight = new Map();

const trimOldest = () => {
  while (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
};

const setRecent = (key, value, ttlMs) => {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
  trimOldest();
};

const memo = async (key, ttlMs, producer) => {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    setRecent(key, hit.value, ttlMs);
    return hit.value;
  }
  if (inflight.has(key)) return inflight.get(key);

  const run = Promise.resolve()
    .then(producer)
    .then((value) => {
      setRecent(key, value, ttlMs);
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, run);
  return run;
};

const normalize = (value) => String(value || '').trim().toLowerCase();
const normalizeDiversity = (value) =>
  normalize(value) === RADIO_DIVERSITY_HIGH ? RADIO_DIVERSITY_HIGH : RADIO_DIVERSITY_DEFAULT;
const secureRandomInt = (max) => {
  if (!Number.isFinite(max) || max <= 0) return 0;
  try {
    return randomInt(max);
  } catch {
    return Math.floor(Math.random() * max);
  }
};
const shuffleRows = (rows = []) => {
  if (!Array.isArray(rows) || rows.length <= 1) return Array.isArray(rows) ? [...rows] : [];
  const out = [...rows];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = secureRandomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
const takeShuffled = (rows = [], count = 0) => shuffleRows(rows).slice(0, Math.max(0, count));
const interleaveGroups = (groups = []) => {
  const sources = Array.isArray(groups) ? groups : [];
  const maxLen = sources.reduce(
    (max, rows) => Math.max(max, Array.isArray(rows) ? rows.length : 0),
    0,
  );
  const out = [];
  for (let i = 0; i < maxLen; i += 1) {
    for (const rows of sources) {
      if (Array.isArray(rows) && rows[i]) out.push(rows[i]);
    }
  }
  return out;
};
const joinQueryParts = (...parts) =>
  parts
    .map((entry) => normalize(entry))
    .filter(Boolean)
    .join(' ')
    .trim();
const idOf = (track) => String(track?.id || track?.videoId || '');
const titleOf = (track) => String(track?.name || track?.title || '').trim();
const artistOf = (track) =>
  String(track?.artist || track?.artists?.[0]?.name || track?.author || '').trim();
const hasDisplayShape = (track) =>
  Boolean(
    track
    && typeof track === 'object'
    && (track.id || track.videoId)
    && typeof track.title === 'string'
    && typeof track.artist === 'string',
  );
const coerceTrack = (track) => {
  if (!track || typeof track !== 'object') return null;
  if (hasDisplayShape(track)) return track;
  const mapped = deps.toTrackDTO(track);
  if (mapped) return mapped;
  const fallbackId = idOf(track);
  if (!fallbackId) return null;
  const fallbackTitle = titleOf(track) || 'Untitled';
  const fallbackArtist = artistOf(track) || 'Unknown artist';
  return {
    id: String(track.id || track.videoId || fallbackId),
    videoId: String(track.videoId || track.id || fallbackId),
    title: fallbackTitle,
    artist: fallbackArtist,
    thumbnail: track.thumbnail || null,
    playable: true,
  };
};

const dedupeTracks = (rows = []) => {
  const seen = new Set();
  const out = [];
  for (const track of rows) {
    const dto = coerceTrack(track);
    if (!dto) continue;
    const key = idOf(dto);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(dto);
  }
  return out;
};

const toPulseHighlight = (track, index) => ({
  id: track.id || `hl-${index}`,
  title: track.title,
  subtitle: track.artist,
  thumbnail: track.thumbnail,
  statLabel: index < 3 ? 'Now peaking' : 'Community save',
  statValue: index < 3 ? `${index + 1}` : null,
  track,
});

const JOURNEY_PRESETS = [
  {
    id: 'journey-night-drive',
    title: 'Midnight Drive',
    blurb: 'Neon-lit road tracks and after-hours momentum.',
    mood: 'lounge',
    genre: 'electronic',
    seed: 'night drive',
  },
  {
    id: 'journey-soft-focus',
    title: 'Soft Focus',
    blurb: 'Calm discoveries built for deep concentration.',
    mood: 'focus',
    genre: 'ambient',
    seed: 'focus',
  },
  {
    id: 'journey-high-energy',
    title: 'High Voltage',
    blurb: 'Fast rising records for an energy spike.',
    mood: 'workout',
    genre: 'dance',
    seed: 'hype',
  },
];

const queryForRadio = ({ mood, genre, seed }) => {
  const parts = [mood, genre, seed].map((entry) => normalize(entry)).filter(Boolean);
  if (!parts.length) return 'new songs official music video';
  return `${parts.join(' ')} music`;
};

const buildHighDiversityQueries = ({ mood, genre, seed }) => {
  const safeMood = normalize(mood);
  const safeGenre = normalize(genre);
  const seedTokens = normalize(seed)
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 3);
  const seedToken = seedTokens[0] || '';
  const context = joinQueryParts(safeMood, safeGenre) || safeMood || safeGenre || 'music';
  const decadeHint = DIVERSITY_DECADE_HINTS[secureRandomInt(DIVERSITY_DECADE_HINTS.length)] || '90s';
  const queries = [
    queryForRadio({ mood: safeMood, genre: safeGenre, seed }),
    joinQueryParts(context, seedToken, 'old songs'),
    joinQueryParts(context, seedToken, 'new songs'),
    joinQueryParts(context, 'deep cuts'),
    joinQueryParts(context, 'underrated songs'),
    joinQueryParts(decadeHint, safeGenre || safeMood || 'music', 'classics'),
    joinQueryParts(seedToken, safeGenre || safeMood || 'music', 'indie songs'),
  ];
  return Array.from(new Set(queries.filter(Boolean)));
};

const buildDiversityQuotas = (limit) => {
  const safeLimit = Math.max(6, Math.min(60, Number(limit) || 24));
  const quotas = {
    search: Math.max(1, Math.round(safeLimit * 0.4)),
    classics: Math.max(1, Math.round(safeLimit * 0.3)),
    deepCuts: Math.max(1, Math.round(safeLimit * 0.2)),
    popular: Math.max(1, Math.round(safeLimit * 0.1)),
  };
  let total = Object.values(quotas).reduce((sum, value) => sum + value, 0);
  while (total > safeLimit) {
    const key = Object.keys(quotas)
      .filter((entry) => quotas[entry] > 1)
      .sort((a, b) => quotas[b] - quotas[a])[0];
    if (!key) break;
    quotas[key] -= 1;
    total -= 1;
  }
  while (total < safeLimit) {
    quotas.search += 1;
    total += 1;
  }
  return quotas;
};

const fetchDiversitySearchRows = async ({ mood, genre, seed, limit }) => {
  const queries = buildHighDiversityQueries({ mood, genre, seed }).slice(0, 7);
  if (!queries.length) return [];
  const perQuery = Math.max(8, Math.ceil((Math.max(6, limit) * 2) / queries.length));
  const groups = await Promise.all(
    queries.map((query) => deps.ytm.searchSongs(query, perQuery).catch(() => [])),
  );
  return dedupeTracks(interleaveGroups(groups.map((rows) => takeShuffled(rows, perQuery))));
};

const fetchClassicRadioRows = async ({ limit }) => {
  const payload = await deps.fetchRealChartData({
    mode: 'songs',
    region: 'global',
    window: 'all_time',
    limit: Math.max(Math.max(6, limit) * 2, 40),
  }).catch(() => ({ items: [] }));
  return dedupeTracks(payload?.items || []);
};

const fetchDeepCutRadioRows = async ({ anchors = [], limit }) => {
  const anchorRows = takeShuffled(dedupeTracks(anchors), Math.min(3, Math.max(1, Math.ceil(limit / 20))));
  if (!anchorRows.length) return [];
  const perAnchor = Math.max(3, Math.ceil(Math.max(6, limit) / Math.max(1, anchorRows.length)));
  const groups = await Promise.all(
    anchorRows.map(async (anchor) => {
      if (!anchor?.artist || !anchor?.title) return [];
      const similar = await deps.lastfm
        .getSimilarTracks(anchor.artist, anchor.title, perAnchor * 2)
        .catch(() => []);
      const shortlist = takeShuffled(similar, perAnchor);
      const resolved = await Promise.all(
        shortlist.map(async (row) => {
          const query = `${row?.name || ''} ${row?.artist || ''}`.trim();
          if (!query) return null;
          const rows = await deps.ytm.searchSongs(query, 1).catch(() => []);
          return rows[0] || null;
        }),
      );
      return resolved.filter(Boolean);
    }),
  );
  return dedupeTracks(interleaveGroups(groups));
};

const fetchHighDiversityRadioItems = async ({ mood, genre, seed, limit = 24 }) => {
  const safeLimit = Math.max(6, Math.min(60, Number(limit) || 24));
  const quotas = buildDiversityQuotas(safeLimit);
  const [searchRows, classicRows, popularRows] = await Promise.all([
    fetchDiversitySearchRows({ mood, genre, seed, limit: safeLimit }),
    fetchClassicRadioRows({ limit: safeLimit }),
    deps.ytm.getTrendingLive(Math.max(10, Math.ceil(safeLimit / 2))).catch(() => []),
  ]);
  const deepCutRows = await fetchDeepCutRadioRows({
    anchors: [...searchRows, ...classicRows],
    limit: safeLimit,
  });
  const pickedSearch = takeShuffled(searchRows, quotas.search);
  const pickedClassics = takeShuffled(classicRows, quotas.classics);
  const pickedDeepCuts = takeShuffled(deepCutRows, quotas.deepCuts);
  const pickedPopular = takeShuffled(popularRows, quotas.popular);
  const curated = dedupeTracks([
    ...pickedSearch,
    ...pickedClassics,
    ...pickedDeepCuts,
    ...pickedPopular,
  ]);
  const refillPool = dedupeTracks(
    shuffleRows([
      ...searchRows,
      ...classicRows,
      ...deepCutRows,
      ...popularRows,
    ]),
  );
  const items = dedupeTracks([...curated, ...refillPool]).slice(0, safeLimit);
  return {
    items,
    buckets: {
      search: { available: searchRows.length, picked: pickedSearch.length },
      classics: { available: classicRows.length, picked: pickedClassics.length },
      deepCuts: { available: deepCutRows.length, picked: pickedDeepCuts.length },
      popular: { available: popularRows.length, picked: pickedPopular.length },
    },
  };
};

const fetchRadioItems = async ({
  mood,
  genre,
  seed,
  limit = 24,
  diversity = RADIO_DIVERSITY_DEFAULT,
}) => {
  const safeLimit = Math.max(6, Math.min(60, Number(limit) || 24));
  const safeDiversity = normalizeDiversity(diversity);
  if (safeDiversity === RADIO_DIVERSITY_HIGH) {
    return fetchHighDiversityRadioItems({ mood, genre, seed, limit: safeLimit });
  }
  const query = queryForRadio({ mood, genre, seed });
  const requested = Math.max(safeLimit * 2, 40);
  const [searchRows, trendingRows] = await Promise.all([
    deps.ytm.searchSongs(query, requested).catch(() => []),
    deps.ytm.getTrendingLive(Math.max(12, safeLimit)).catch(() => []),
  ]);
  return {
    items: dedupeTracks([...searchRows, ...trendingRows]).slice(0, safeLimit),
    buckets: null,
  };
};

const fetchExplorePulse = async ({ region = 'global' } = {}) =>
  memo(`pulse:${normalize(region)}`, PULSE_TTL_MS, async () => {
    const [trendingRows, chartToday, chartWeek] = await Promise.all([
      deps.ytm.getTrendingLive(24).catch(() => []),
      deps.fetchRealChartData({
        mode: 'songs',
        region,
        window: 'today',
        limit: 24,
      }).catch(() => ({ items: [] })),
      deps.fetchRealChartData({
        mode: 'songs',
        region,
        window: 'this_week',
        limit: 24,
      }).catch(() => ({ items: [] })),
    ]);

    const trending = dedupeTracks(trendingRows).slice(0, 12);
    const todayItems = dedupeTracks(chartToday?.items || []).slice(0, 12);
    const weekItems = dedupeTracks(chartWeek?.items || []).slice(0, 12);
    const merged = dedupeTracks([...trending, ...todayItems, ...weekItems]).slice(0, 10);
    const highlights = merged.map(toPulseHighlight);

    return {
      highlights,
      chartWindows: {
        today: todayItems,
        thisWeek: weekItems,
      },
      journeys: JOURNEY_PRESETS,
      meta: {
        source: 'live',
        generatedAt: new Date().toISOString(),
      },
    };
  });

const fetchExploreRadio = async ({
  mood = '',
  genre = '',
  seed = '',
  diversity = RADIO_DIVERSITY_DEFAULT,
  limit = 24,
} = {}) =>
  memo(
    `radio:${normalize(mood)}|${normalize(genre)}|${normalize(seed)}|${normalizeDiversity(diversity)}|${Math.round(limit)}`,
    RADIO_TTL_MS,
    async () => {
      const safeDiversity = normalizeDiversity(diversity);
      const radio = await fetchRadioItems({
        mood,
        genre,
        seed,
        diversity: safeDiversity,
        limit: Math.max(6, Math.min(60, Number(limit) || 24)),
      });
      return {
        items: radio.items,
        seed: {
          mood: normalize(mood),
          genre: normalize(genre),
          seed: normalize(seed),
          diversity: safeDiversity,
        },
        meta: {
          source: 'live',
          diversity: safeDiversity,
          buckets: radio.buckets || undefined,
          generatedAt: new Date().toISOString(),
        },
      };
    },
  );

const fetchExploreSimilar = async ({ trackId = '', limit = 12 } = {}) =>
  memo(`similar:${trackId}|${Math.round(limit)}`, SIMILAR_TTL_MS, async () => {
    const safeLimit = Math.max(4, Math.min(30, Number(limit) || 12));
    if (!trackId) return { items: [], meta: { source: 'empty' } };

    const anchorCandidates = await deps.ytm.searchSongs(trackId, 5).catch(() => []);
    const anchor =
      anchorCandidates.find((row) => String(row?.videoId || row?.id) === String(trackId))
      || anchorCandidates[0]
      || null;
    const anchorTitle = titleOf(anchor);
    const anchorArtist = artistOf(anchor);

    let similarRows = [];
    if (anchorTitle && anchorArtist) {
      const lastfmMatches = await deps.lastfm.getSimilarTracks(anchorArtist, anchorTitle, safeLimit * 2);
      const enriched = await Promise.all(
        lastfmMatches.slice(0, safeLimit * 2).map(async (entry) => {
          const query = `${entry?.name || ''} ${entry?.artist || ''}`.trim();
          const rows = await deps.ytm.searchSongs(query, 1).catch(() => []);
          return rows[0] || null;
        }),
      );
      similarRows = enriched.filter(Boolean);
    }

    if (similarRows.length === 0) {
      similarRows = await deps.ytm
        .searchSongs(`similar to ${anchorTitle || trackId}`, safeLimit * 2)
        .catch(() => []);
    }

    return {
      items: dedupeTracks(similarRows).slice(0, safeLimit),
      anchor: anchorTitle
        ? {
            title: anchorTitle,
            artist: anchorArtist || null,
            trackId,
          }
        : null,
      meta: {
        source: similarRows.length ? 'live' : 'fallback',
        generatedAt: new Date().toISOString(),
      },
    };
  });

const fetchExploreJourney = async ({
  journeyId = '',
  region = 'global',
} = {}) =>
  memo(`journey:${normalize(journeyId)}|${normalize(region)}`, JOURNEY_TTL_MS, async () => {
    const preset = JOURNEY_PRESETS.find((item) => item.id === journeyId) || JOURNEY_PRESETS[0];
    const radio = await fetchExploreRadio({
      mood: preset.mood,
      genre: preset.genre,
      seed: preset.seed,
      limit: 24,
    });
    return {
      id: preset.id,
      title: preset.title,
      blurb: preset.blurb,
      mood: preset.mood,
      genre: preset.genre,
      seed: preset.seed,
      region: normalize(region) || 'global',
      items: radio.items,
      meta: {
        source: radio.meta?.source || 'live',
        generatedAt: new Date().toISOString(),
      },
    };
  });

module.exports = {
  fetchExplorePulse,
  fetchExploreRadio,
  fetchExploreSimilar,
  fetchExploreJourney,
  __testing: {
    clearCaches: () => {
      cache.clear();
      inflight.clear();
    },
    setDeps: (patch = {}) => {
      Object.assign(deps, patch);
    },
    resetDeps: () => {
      Object.assign(deps, defaultDeps);
    },
  },
};
