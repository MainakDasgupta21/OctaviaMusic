import { getCharts, getExploreRadio, getTrending, searchMusic } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

const STRATEGY_KEYWORDS = [
  'midnight',
  'sunrise',
  'neon',
  'retro',
  'cinematic',
  'groove',
  'ambient',
  'indie',
  'underground',
  'dreamy',
  'acoustic',
  'velvet',
  'aurora',
  'afterglow',
];

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');
const ALPHABET_SUFFIXES = [
  'songs',
  'music',
  'official music video',
  'live performance',
  'acoustic songs',
  'indie songs',
];

const FRESH_STRATEGY_IDS = new Set(['fresh-heat', 'classic-vault', 'trending-pulse']);

const normalize = (value) =>
  String(value || '')
    .trim()
    .toLowerCase();

const tokenize = (value) =>
  normalize(value)
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 2);

const dedupeStrings = (rows = []) => {
  const seen = new Set();
  const out = [];
  for (const row of rows || []) {
    const value = String(row || '').trim();
    const key = normalize(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
};

const stableHash = (value) => {
  const text = String(value || '');
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
};

const mulberry32 = (seed) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const seededRng = (seed) => mulberry32(stableHash(seed || 'seed'));

const pickWeighted = (rows = [], rng = Math.random) => {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const total = rows.reduce((sum, row) => sum + Math.max(0, Number(row.weight) || 0), 0);
  if (total <= 0) return rows[0] || null;
  let cursor = rng() * total;
  for (const row of rows) {
    cursor -= Math.max(0, Number(row.weight) || 0);
    if (cursor <= 0) return row;
  }
  return rows[rows.length - 1] || null;
};

const pickFromSeed = (rows = [], seed = '') => {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  const rng = seededRng(seed);
  const index = Math.floor(rng() * rows.length);
  return rows[index] || rows[0] || '';
};

const clampLimit = (value, fallback = 40) =>
  Math.max(10, Math.min(60, Number(value) || fallback));

const joinTerms = (...parts) =>
  parts
    .map((entry) => String(entry || '').trim())
    .filter(Boolean)
    .join(' ')
    .trim();

export const resolveSeedArtists = (ctx = {}, max = 5) => {
  const favorites = Array.isArray(ctx.favorites) ? ctx.favorites : [];
  const history = Array.isArray(ctx.history) ? ctx.history : [];
  const followedArtists = Array.isArray(ctx.followedArtists) ? ctx.followedArtists : [];
  const explicitSeedArtists = Array.isArray(ctx.seedArtists) ? ctx.seedArtists : [];
  const fromFavorites = favorites.map((track) => track?.artist);
  const fromHistory = history.map((track) => track?.artist);
  const fromFollowed = followedArtists.map((artist) => artist?.name || artist?.slug);
  const anchorArtist = ctx?.tasteSeed?.anchorArtist ? [ctx.tasteSeed.anchorArtist] : [];
  return dedupeStrings([
    ...explicitSeedArtists,
    ...anchorArtist,
    ...fromFavorites,
    ...fromHistory,
    ...fromFollowed,
  ]).slice(0, Math.max(1, max));
};

const hasPersonalSignals = (ctx = {}) =>
  resolveSeedArtists(ctx, 1).length > 0
  || Boolean(ctx?.tasteProfile?.likedTrackIds?.length);

const buildRadioSeed = (ctx = {}, strategy = '') =>
  normalize(joinTerms(strategy, ctx.visitSeed || '', ctx.mood || '', ctx.genre || ''));

const buildRadioRequest = (ctx = {}, strategy = 'default') => {
  const limit = clampLimit(ctx.limit, 40);
  const mood = normalize(ctx.mood || '');
  const genre = normalize(ctx.genre || '');
  const seedArtists = resolveSeedArtists(ctx, 5).join(',');
  const seed = buildRadioSeed(ctx, strategy);
  return {
    queryKey: queryKeys.exploreRadio({
      mood,
      genre,
      seed,
      limit,
      strategy,
      seedArtists,
    }),
    queryFn: ({ signal }) =>
      getExploreRadio({
        mood,
        genre,
        seed,
        strategy,
        seedArtists,
        limit,
        signal,
      }),
    strategyId: strategy,
  };
};

export const buildKeywordQuery = (ctx = {}) => {
  const keywordPool = dedupeStrings([
    ...STRATEGY_KEYWORDS,
    ...tokenize(ctx.mood),
    ...tokenize(ctx.genre),
    ...tokenize(ctx.seed),
  ]);
  const token = pickFromSeed(keywordPool, `${ctx.visitSeed || 'seed'}:keyword`) || 'music';
  return joinTerms(token, ctx.genre || ctx.mood || '', 'songs');
};

export const buildAlphabetQuery = (ctx = {}) => {
  const letter = pickFromSeed(ALPHABET, `${ctx.visitSeed || 'seed'}:letter`) || 'a';
  const suffix = pickFromSeed(
    ALPHABET_SUFFIXES,
    `${ctx.visitSeed || 'seed'}:suffix`,
  ) || 'songs';
  return joinTerms(letter, ctx.genre || ctx.mood || '', suffix);
};

export const EXPLORE_STRATEGIES = [
  {
    id: 'artist-dive',
    label: 'Artist dive',
    weight: 1.1,
    requires: (ctx) => resolveSeedArtists(ctx, 1).length > 0,
    build: (ctx) => buildRadioRequest(ctx, 'artist'),
  },
  {
    id: 'keyword-roulette',
    label: 'Keyword roulette',
    weight: 1,
    requires: () => true,
    build: (ctx) => {
      const query = buildKeywordQuery(ctx);
      const limit = clampLimit(ctx.limit, 40);
      return {
        queryKey: queryKeys.search(query, 'songs', limit),
        queryFn: ({ signal }) => searchMusic(query, 'songs', { limit, signal }),
        strategyId: 'keyword',
      };
    },
  },
  {
    id: 'alphabet-search',
    label: 'Alphabet search',
    weight: 0.9,
    requires: () => true,
    build: (ctx) => {
      const query = buildAlphabetQuery(ctx);
      const limit = clampLimit(ctx.limit, 40);
      return {
        queryKey: queryKeys.search(query, 'songs', limit),
        queryFn: ({ signal }) => searchMusic(query, 'songs', { limit, signal }),
        strategyId: 'alphabet',
      };
    },
  },
  {
    id: 'trending-pulse',
    label: 'Trending pulse',
    weight: 1.1,
    requires: () => true,
    build: (ctx) => {
      const limit = clampLimit(ctx.limit, 40);
      return {
        queryKey: queryKeys.trending(limit),
        queryFn: ({ signal }) => getTrending({ limit, signal }),
        strategyId: 'trending',
      };
    },
  },
  {
    id: 'fresh-heat',
    label: 'Fresh heat',
    weight: 1,
    requires: () => true,
    build: (ctx) => {
      const limit = clampLimit(ctx.limit, 40);
      return {
        queryKey: queryKeys.charts('global', 'this_month', limit),
        queryFn: ({ signal }) =>
          getCharts({
            region: 'global',
            window: 'this_month',
            limit,
            signal,
          }),
        strategyId: 'fresh',
      };
    },
  },
  {
    id: 'classic-vault',
    label: 'Classic vault',
    weight: 0.85,
    requires: () => true,
    build: (ctx) => {
      const limit = clampLimit(ctx.limit, 40);
      return {
        queryKey: queryKeys.charts('global', 'all_time', limit),
        queryFn: ({ signal }) =>
          getCharts({
            region: 'global',
            window: 'all_time',
            limit,
            signal,
          }),
        strategyId: 'classic',
      };
    },
  },
  {
    id: 'genre-lane',
    label: 'Genre lane',
    weight: 1,
    requires: (ctx) => Boolean(normalize(ctx.genre)),
    build: (ctx) => buildRadioRequest(ctx, 'genre'),
  },
  {
    id: 'mood-lane',
    label: 'Mood lane',
    weight: 1,
    requires: (ctx) => Boolean(normalize(ctx.mood)),
    build: (ctx) => buildRadioRequest(ctx, 'mood'),
  },
  {
    id: 'hidden-crate',
    label: 'Hidden crate',
    weight: 0.85,
    requires: () => true,
    build: (ctx) => buildRadioRequest(ctx, 'hidden'),
  },
  {
    id: 'personalized',
    label: 'Personalized',
    weight: 1.3,
    requires: (ctx) => hasPersonalSignals(ctx),
    build: (ctx) => buildRadioRequest(ctx, 'personalized'),
  },
  {
    id: 'mixed-bag',
    label: 'Mixed bag',
    weight: 1.1,
    requires: () => true,
    build: (ctx) => buildRadioRequest(ctx, 'mixed'),
  },
];

export const getStrategyById = (id) =>
  EXPLORE_STRATEGIES.find((strategy) => strategy.id === id) || null;

export const pickStrategies = ({
  count = 4,
  ctx = {},
  recent = [],
  rng = null,
} = {}) => {
  const safeCount = Math.max(1, Math.floor(count || 1));
  const available = EXPLORE_STRATEGIES
    .filter((strategy) => (typeof strategy.requires === 'function' ? strategy.requires(ctx) : true))
    .map((strategy) => ({ ...strategy }));
  if (!available.length) return [];

  const random = typeof rng === 'function'
    ? rng
    : seededRng(`${ctx.visitSeed || 'seed'}:${ctx.mood || ''}:${ctx.genre || ''}`);
  const recentSet = new Set((recent || []).map((entry) => normalize(entry)));
  const weighted = available.map((strategy) => ({
    ...strategy,
    weight: Math.max(
      0.05,
      Number(strategy.weight || 1) * (recentSet.has(strategy.id) ? 0.3 : 1),
    ),
  }));
  const selected = [];
  const selectedIds = new Set();

  const pickRequired = (predicate) => {
    if (selected.length >= safeCount) return;
    const pool = weighted.filter((strategy) => !selectedIds.has(strategy.id) && predicate(strategy));
    if (!pool.length) return;
    const picked = pickWeighted(pool, random);
    if (!picked) return;
    selected.push(picked);
    selectedIds.add(picked.id);
  };

  if (hasPersonalSignals(ctx)) {
    pickRequired((strategy) => strategy.id === 'personalized');
  }
  pickRequired((strategy) => FRESH_STRATEGY_IDS.has(strategy.id));

  while (selected.length < safeCount && selectedIds.size < weighted.length) {
    const pool = weighted.filter((strategy) => !selectedIds.has(strategy.id));
    if (!pool.length) break;
    const picked = pickWeighted(pool, random);
    if (!picked) break;
    selected.push(picked);
    selectedIds.add(picked.id);
  }

  return selected.slice(0, safeCount);
};

export const buildStrategyRequest = (strategy, ctx = {}) => {
  const base = typeof strategy === 'string' ? getStrategyById(strategy) : strategy;
  if (!base) return null;
  const payload = base.build(ctx);
  if (!payload?.queryKey || typeof payload.queryFn !== 'function') return null;
  return {
    id: base.id,
    label: base.label,
    strategyId: payload.strategyId || base.id,
    queryKey: payload.queryKey,
    queryFn: payload.queryFn,
  };
};

export const buildStrategyRequests = ({
  strategies = [],
  ctx = {},
} = {}) => (strategies || [])
  .map((strategy) => buildStrategyRequest(strategy, ctx))
  .filter(Boolean);

export default {
  EXPLORE_STRATEGIES,
  resolveSeedArtists,
  pickStrategies,
  getStrategyById,
  buildStrategyRequest,
  buildStrategyRequests,
  buildKeywordQuery,
  buildAlphabetQuery,
};
