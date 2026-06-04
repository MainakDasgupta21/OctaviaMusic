// =============================================================================
// Search ranking core.
// One place decides "what is a good hit" across TopBar, /search and Cmd+K.
// =============================================================================

import {
  emptyIntent,
  expandIntent,
  stripSortHints,
} from './search-intent';

// =============================================================================
// Tunable weights. Keeping these in one block makes it easy to A/B-test the
// balance between lexical relevance and global popularity without hunting
// through the scoring fn.
// =============================================================================
const WEIGHTS = {
  // Songs that score below `SCORE_FLOOR` lexically AND below
  // `POPULARITY_RESCUE` for popularity get filtered out. Famous songs whose
  // titles barely overlap the query (e.g. typos) survive the floor when their
  // popularity term is strong enough.
  SCORE_FLOOR: 60,
  POPULARITY_RESCUE: 80,

  // Popularity contributors. Sigmoid on rank means rank=0 ≈ +180 (top hit),
  // rank=8 ≈ +66, rank=20 ≈ +13 — gracefully decaying so the second-place
  // result still gets a meaningful boost without dominating an exact title
  // match (1000pt).
  RANK_AT_ZERO: 180,
  RANK_DECAY_K: 8,
  PLAYS_LOG_FACTOR: 12,
  PLAYS_CAP: 120,
  MONTHLY_LOG_FACTOR: 14,
  MONTHLY_CAP: 140,
  VERIFIED: 60,
  // SONG-vs-VIDEO bias: `kind:'song'` is YTM's official catalog (album metadata
  // present, cleaner thumbnails). When both exist for the same query, prefer
  // the SONG entry.
  OFFICIAL_SONG_BONUS: 25,

  // Intent / personalization signals (slice 2/3). Tuned to be additive on
  // top of lexical without dethroning an exact title match.
  INTENT_HIT: 35,
  ALIAS_HIT: 80,
  ABBREVIATION_HIT: 28,
  RECENT_RELEASE: 24,
  ARTIST_AFFINITY_CAP: 60,
  RECENT_SEARCH_HIT: 18,
  EXPLICIT_PENALTY: 200,
  KIND_DUP_BIAS: 80,
  PLAYABLE_PENALTY: 35,
};

const SCORE_FLOOR = WEIGHTS.SCORE_FLOOR;
const DEFAULT_LIMIT = 24;
const TYPE_VALUES = new Set(['song', 'artist', 'album']);
const EXACT_SONG_MATCH_TIERS = new Set(['exact', 'prefix']);

const isFiniteNumber = (v) => Number.isFinite(v);

const firstFinite = (...values) => values.find((v) => isFiniteNumber(v));

// =============================================================================
// Popularity parsing. `ytmusic-api` v5.3.1 doesn't expose numeric play counts
// or monthly listeners, but the catalog fallback does (e.g. "78.4M monthly
// listeners", "6_200_000_000" plays). Both shapes parse here.
// =============================================================================
const SUFFIX_MULTIPLIERS = {
  k: 1e3,
  m: 1e6,
  b: 1e9,
  t: 1e12,
};

// Extract the first number-with-optional-suffix from a string. Examples:
//   "78.4M monthly listeners" → 78_400_000
//   "1.2B plays"              → 1_200_000_000
//   6_200_000_000             → 6_200_000_000 (already numeric)
const parseHumanCount = (raw) => {
  if (raw == null) return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw >= 0 ? raw : null;
  const str = String(raw).trim();
  if (!str) return null;
  const m = str.match(/(\d+(?:[.,]\d+)?)\s*([kmbt])?/i);
  if (!m) return null;
  const n = Number(m[1].replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  const mul = m[2] ? SUFFIX_MULTIPLIERS[m[2].toLowerCase()] || 1 : 1;
  return n * mul;
};

export const parsePlaysCount = parseHumanCount;
export const parseMonthly = parseHumanCount;

// Combine every available popularity signal into a single additive boost.
// Returns 0 when no signals are present so unranked items aren't penalised
// — and crucially are NOT treated as the top hit by accident (a missing
// `rank` is null, not 0).
export const popularityScore = (item) => {
  if (!item || typeof item !== 'object') return 0;

  // `Number.isFinite(item.rank)` rejects `null` / `undefined` / `NaN`. Without
  // this, Number(null) === 0 would treat every unranked item as the #1 hit.
  const fromRank = Number.isFinite(item.rank) && item.rank >= 0
    ? Math.round(WEIGHTS.RANK_AT_ZERO * Math.exp(-item.rank / WEIGHTS.RANK_DECAY_K))
    : 0;

  const plays = parsePlaysCount(item.plays);
  const fromPlays = plays
    ? Math.min(WEIGHTS.PLAYS_CAP, Math.log10(plays + 1) * WEIGHTS.PLAYS_LOG_FACTOR)
    : 0;

  const monthly = parseMonthly(item.monthly);
  const fromMonthly = monthly
    ? Math.min(WEIGHTS.MONTHLY_CAP, Math.log10(monthly + 1) * WEIGHTS.MONTHLY_LOG_FACTOR)
    : 0;

  const fromVerified = item.verified ? WEIGHTS.VERIFIED : 0;
  // Only award the SONG-vs-VIDEO bonus when there's already at least one
  // *signal* present — otherwise an upstream entry that just defaults to
  // `kind: 'song'` would silently float above unranked rivals on no merit.
  const hasAnySignal = fromRank > 0 || fromPlays > 0 || fromMonthly > 0 || fromVerified > 0;
  const fromOfficial = hasAnySignal && item.kind === 'song' ? WEIGHTS.OFFICIAL_SONG_BONUS : 0;

  return Math.round(fromRank + fromPlays + fromMonthly + fromVerified + fromOfficial);
};

const emptyResult = () => ({
  top: null,
  songs: [],
  songExact: [],
  songRelated: [],
  artists: [],
  albums: [],
  library: [],
  didYouMean: null,
  all: [],
  activeFilters: {},
  intent: emptyIntent(),
});

const SORT_HINTS = new Set(['relevance', 'popularity', 'newest', 'shortest']);

const normalizeSortHint = (value) => {
  if (!value) return null;
  const lower = String(value).toLowerCase();
  return SORT_HINTS.has(lower) ? lower : null;
};

export const normalize = (value) =>
  (value || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const tokenize = (value) => normalize(value).split(' ').filter(Boolean);

// Early-exit Levenshtein (bounded by `cap`) so fuzzy scoring stays cheap.
export const levenshtein = (a, b, cap = 3) => {
  const left = normalize(a);
  const right = normalize(b);
  if (left === right) return 0;
  if (!left || !right) return Math.max(left.length, right.length);
  if (Math.abs(left.length - right.length) > cap) return cap + 1;

  let prev = Array(right.length + 1)
    .fill(0)
    .map((_, i) => i);
  let curr = Array(right.length + 1).fill(0);

  for (let i = 1; i <= left.length; i += 1) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1, // deletion
        curr[j - 1] + 1, // insertion
        prev[j - 1] + cost, // substitution
      );
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > cap) return cap + 1;
    [prev, curr] = [curr, prev];
  }

  return prev[right.length];
};

const consumeStringFilter = (source, key) => {
  const quotedRe = new RegExp(`(?:^|\\s)${key}:"([^"]+)"(?=\\s|$)`, 'i');
  const quoted = source.match(quotedRe);
  if (quoted?.[1]) {
    return {
      value: quoted[1].trim(),
      rest: source.replace(quoted[0], ' '),
    };
  }

  const plainRe = new RegExp(`(?:^|\\s)${key}:([^\\s]+)(?=\\s|$)`, 'i');
  const plain = source.match(plainRe);
  if (plain?.[1]) {
    return {
      value: plain[1].trim(),
      rest: source.replace(plain[0], ' '),
    };
  }

  return { value: '', rest: source };
};

const consumeTypeFilter = (source) => {
  const re = /(?:^|\s)type:(song|artist|album)(?=\s|$)/i;
  const match = source.match(re);
  if (!match?.[1]) return { value: '', rest: source };
  const value = match[1].toLowerCase();
  if (!TYPE_VALUES.has(value)) return { value: '', rest: source };
  return { value, rest: source.replace(match[0], ' ') };
};

const parseYearValue = (value) => {
  if (isFiniteNumber(value)) return Math.round(value);
  const m = String(value || '').match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
};

const parseDurationSeconds = (value) => {
  if (isFiniteNumber(value)) return Number(value);
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);

  const timeMatch = raw.match(/^(\d+):([0-5]?\d)(?::([0-5]?\d))?$/);
  if (!timeMatch) return null;

  const a = Number(timeMatch[1]);
  const b = Number(timeMatch[2]);
  const c = timeMatch[3] != null ? Number(timeMatch[3]) : null;
  if (c == null) return a * 60 + b; // mm:ss
  return a * 3600 + b * 60 + c; // hh:mm:ss
};

const consumeComparatorFilter = (source, key, parser) => {
  const withColon = new RegExp(`(?:^|\\s)${key}:\\s*(<=|>=|<|>|=)?\\s*([^\\s]+)(?=\\s|$)`, 'i');
  const bare = new RegExp(`(?:^|\\s)${key}(<=|>=|<|>|=)\\s*([^\\s]+)(?=\\s|$)`, 'i');

  let match = source.match(withColon);
  if (!match) match = source.match(bare);
  if (!match) return { value: null, rest: source };

  const op = match[1] || '=';
  const rawValue = match[2];
  const parsedValue = parser(rawValue);
  if (!isFiniteNumber(parsedValue)) return { value: null, rest: source };

  return {
    value: { op, value: parsedValue, raw: rawValue },
    rest: source.replace(match[0], ' '),
  };
};

// Collect every comparator-style operator for `key` (e.g. both `year>=2020`
// and `year<=2024` from the same query). Returns an array of `{op, value, raw}`
// entries plus the leftover source string.
const consumeAllComparatorFilters = (source, key, parser) => {
  let working = source;
  const values = [];
  // Hard cap iterations so a malformed parser never spins forever.
  for (let i = 0; i < 8; i += 1) {
    const next = consumeComparatorFilter(working, key, parser);
    if (!next.value) break;
    values.push(next.value);
    working = next.rest;
  }
  return { values, rest: working };
};

const hasFilterValues = (filters) =>
  Boolean(
    filters?.artist ||
      filters?.album ||
      filters?.type ||
      filters?.year ||
      filters?.duration ||
      filters?.sort,
  );

export const parseQuery = (raw) => {
  const source = (raw || '').trim();
  if (!source) {
    return {
      raw: '',
      terms: '',
      termsNormalized: '',
      tokens: [],
      negativeTokens: [],
      phrases: [],
      filters: {},
      filtersNormalized: {},
      hasFilters: false,
      intent: emptyIntent(),
    };
  }

  const filters = {};
  // Strip `sort:*` pseudo-operators up-front so the tokenizer below doesn't
  // ingest them as positive lexical tokens. The detected hint lives on the
  // returned `intent` object so the ranker can use it without re-parsing.
  let rest = stripSortHints(source);

  const artistFilter = consumeStringFilter(rest, 'artist');
  if (artistFilter.value) {
    filters.artist = artistFilter.value;
    rest = artistFilter.rest;
  }

  const albumFilter = consumeStringFilter(rest, 'album');
  if (albumFilter.value) {
    filters.album = albumFilter.value;
    rest = albumFilter.rest;
  }

  const typeFilter = consumeTypeFilter(rest);
  if (typeFilter.value) {
    filters.type = typeFilter.value;
    rest = typeFilter.rest;
  }

  const yearFilters = consumeAllComparatorFilters(rest, 'year', parseYearValue);
  if (yearFilters.values.length > 0) {
    filters.year = yearFilters.values;
    rest = yearFilters.rest;
  }

  const durationFilters = consumeAllComparatorFilters(rest, 'duration', parseDurationSeconds);
  if (durationFilters.values.length > 0) {
    filters.duration = durationFilters.values;
    rest = durationFilters.rest;
  }

  const phraseMatches = Array.from(rest.matchAll(/"([^"]+)"/g))
    .map((m) => m[1].trim())
    .filter(Boolean);
  const restWithoutPhrases = rest.replace(/"([^"]+)"/g, ' ');

  const positiveRaw = [];
  const negativeRaw = [];
  restWithoutPhrases
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .forEach((token) => {
      if (token.startsWith('-') && token.length > 1) {
        negativeRaw.push(token.slice(1));
      } else {
        positiveRaw.push(token);
      }
    });

  const tokens = positiveRaw.flatMap((t) => tokenize(t));
  const negativeTokens = negativeRaw.flatMap((t) => tokenize(t));
  const phrases = phraseMatches.map((p) => normalize(p)).filter(Boolean);
  const terms = positiveRaw.join(' ').trim();

  const filtersNormalized = {
    artist: normalize(filters.artist || ''),
    album: normalize(filters.album || ''),
  };

  // Intent expansion (aliases, abbreviations, sort hint, explicit handling).
  // Computed once here so consumers can read `parsed.intent.*` without paying
  // the cost on every scoreItem call.
  const intent = expandIntent({
    tokens,
    terms,
    raw: source,
  });

  if (intent.sortHint) {
    filters.sort = intent.sortHint;
  }

  return {
    raw: source,
    terms,
    termsNormalized: normalize(terms),
    tokens,
    negativeTokens,
    phrases,
    filters,
    filtersNormalized,
    hasFilters: hasFilterValues(filters),
    intent,
  };
};

const slugify = (value) => normalize(value).replace(/\s+/g, '-');

const inferKind = (item) => {
  const t = (item?.type || '').toLowerCase();
  if (t === 'artist' || t === 'album' || t === 'song') return t;
  if (item?.name && !item?.title) return 'artist';
  return 'song';
};

const getPrimaryText = (item, kind) => {
  if (kind === 'artist') return item?.name || item?.artist || '';
  return item?.title || item?.name || '';
};

const getArtistText = (item, kind) => {
  if (kind === 'artist') return item?.name || item?.artist || '';
  return item?.artist || '';
};

const getAlbumText = (item) => item?.album || item?.albumTitle || '';

const dedupeKey = (item, kind) => {
  const stableId = item?.videoId || item?.id;
  if (stableId) return `${kind}:${stableId}`;
  return `${kind}:${normalize(getPrimaryText(item, kind))}::${normalize(getArtistText(item, kind))}`;
};

const countDefined = (item) =>
  Object.values(item || {}).reduce((acc, v) => {
    if (v == null) return acc;
    if (typeof v === 'string' && v.trim() === '') return acc;
    return acc + 1;
  }, 0);

const pickRicher = (left, right) =>
  countDefined(right) > countDefined(left) ? right : left;

const acronymOf = (value) => tokenize(value).map((t) => t[0]).join('');

const allTokensIn = (tokens, haystack) =>
  tokens.length > 0 && tokens.every((t) => haystack.includes(t));

const hitCount = (tokens, haystack) =>
  tokens.reduce((n, t) => (haystack.includes(t) ? n + 1 : n), 0);

const bestFuzzyDistance = (queryNorm, candidates) => {
  if (!queryNorm) return { distance: Infinity, threshold: 2 };
  const threshold = queryNorm.length <= 6 ? 1 : 2;
  let best = Infinity;
  for (const c of candidates) {
    const d = levenshtein(queryNorm, c, threshold + 1);
    if (d < best) best = d;
    if (best === 0) break;
  }
  return { distance: best, threshold };
};

const toSafeComparator = (filter) =>
  filter && isFiniteNumber(filter.value) ? filter : null;

const compareNumeric = (value, filter) => {
  const safe = toSafeComparator(filter);
  if (!safe) return true;
  if (!isFiniteNumber(value)) return false;
  switch (safe.op) {
    case '<':
      return value < safe.value;
    case '<=':
      return value <= safe.value;
    case '>':
      return value > safe.value;
    case '>=':
      return value >= safe.value;
    case '=':
    default:
      return value === safe.value;
  }
};

const parseItemYear = (item) =>
  firstFinite(
    parseYearValue(item?.year),
    parseYearValue(item?.releaseYear),
    parseYearValue(item?.release_date),
    parseYearValue(item?.publishedAt),
  );

const parseItemDuration = (item) =>
  firstFinite(
    parseDurationSeconds(item?.durationSec),
    parseDurationSeconds(item?.durationSeconds),
    parseDurationSeconds(item?.lengthSeconds),
    parseDurationSeconds(item?.duration),
  );

const normalizeCandidate = (raw, source, sourceMeta = {}) => {
  const kind = inferKind(raw);

  if (kind === 'artist') {
    const name = raw?.name || raw?.artist || raw?.title || 'Unknown artist';
    return {
      kind,
      item: {
        ...raw,
        type: 'artist',
        name,
        artist: name,
        slug: raw?.slug || slugify(name),
      },
      source,
      sourceMeta,
    };
  }

  if (kind === 'album') {
    return {
      kind,
      item: {
        ...raw,
        type: 'album',
        title: raw?.title || raw?.name || 'Untitled album',
        artist: raw?.artist || raw?.artistName || 'Unknown artist',
      },
      source,
      sourceMeta,
    };
  }

  return {
    kind: 'song',
    item: {
      ...raw,
      type: raw?.type || 'song',
      title: raw?.title || raw?.name || 'Untitled',
      artist: raw?.artist || raw?.artistName || 'Unknown artist',
    },
    source,
    sourceMeta,
  };
};

const intentMatchesCandidate = (intentToken, item, kind) => {
  if (!intentToken) return false;
  const t = String(intentToken).toLowerCase();
  // Special-case `feat`: matches when the title carries a "(feat. X)" suffix
  // OR the candidate already declares a `featuring` flag.
  if (t === 'feat') {
    const title = (item?.title || item?.name || '').toLowerCase();
    if (/\b(feat|featuring|ft)\b/.test(title)) return true;
    if (item?.featuring || (Array.isArray(item?.featuredArtists) && item.featuredArtists.length)) {
      return true;
    }
    return false;
  }

  const haystack = normalize(
    [
      item?.title,
      item?.name,
      item?.album,
      item?.albumTitle,
      item?.subtitle,
    ]
      .filter(Boolean)
      .join(' '),
  );
  if (haystack.includes(t)) return true;
  // YT entries occasionally carry a `kind` of "video" that maps to the same
  // semantic ("official video" intent) — use it as a soft heuristic.
  if (t === 'official' && (item?.kind === 'song' || item?.official)) return true;
  if (t === 'live' && (item?.kind === 'video' && /live/.test(haystack))) return true;
  return false;
};

const aliasMatchScore = (aliasTerms, nameNorm, artistNorm) => {
  if (!aliasTerms?.length) return 0;
  let bonus = 0;
  for (const term of aliasTerms) {
    const t = normalize(term);
    if (!t) continue;
    if (artistNorm && (artistNorm === t || artistNorm.includes(t))) {
      bonus += WEIGHTS.ALIAS_HIT;
    } else if (nameNorm && nameNorm.includes(t)) {
      bonus += WEIGHTS.ALIAS_HIT * 0.6;
    } else if (nameNorm) {
      // Fall back to fuzzy on the name — handles "MJ" -> "Michael Jackson"
      // when the candidate is a song titled with "MJ" in the haystack.
      const { distance, threshold } = bestFuzzyDistance(t, [nameNorm, artistNorm].filter(Boolean));
      if (distance <= threshold) bonus += WEIGHTS.ALIAS_HIT * 0.4;
    }
  }
  return bonus;
};

const abbreviationMatchScore = (abbreviationTokens, nameNorm, albumNorm) => {
  if (!abbreviationTokens?.length) return 0;
  let bonus = 0;
  for (const token of abbreviationTokens) {
    const t = normalize(token);
    if (!t) continue;
    if (nameNorm.includes(t)) bonus += WEIGHTS.ABBREVIATION_HIT;
    else if (albumNorm.includes(t)) bonus += WEIGHTS.ABBREVIATION_HIT * 0.5;
  }
  return bonus;
};

const artistAffinityBoost = (artistNorm, historyArtistCounts) => {
  if (!historyArtistCounts || !artistNorm) return 0;
  const count =
    typeof historyArtistCounts.get === 'function'
      ? historyArtistCounts.get(artistNorm) || 0
      : historyArtistCounts[artistNorm] || 0;
  if (count <= 0) return 0;
  return Math.min(WEIGHTS.ARTIST_AFFINITY_CAP, 12 + count * 4);
};

const recentReleaseBoost = (item, currentYear) => {
  const year = parseItemYear(item);
  if (!Number.isFinite(year)) return 0;
  if (year > currentYear + 1) return 0; // mis-tagged future date, ignore
  if (year >= currentYear - 2) return WEIGHTS.RECENT_RELEASE;
  if (year >= currentYear - 5) return Math.round(WEIGHTS.RECENT_RELEASE * 0.4);
  return 0;
};

const recentSearchBoost = (recentSearchTerms, nameNorm, artistNorm) => {
  if (!recentSearchTerms?.size || !nameNorm) return 0;
  const haystack = `${nameNorm} ${artistNorm}`;
  for (const term of recentSearchTerms) {
    const t = normalize(term);
    if (t && haystack.includes(t)) return WEIGHTS.RECENT_SEARCH_HIT;
  }
  return 0;
};

const isExplicit = (item) =>
  Boolean(item?.explicit === true || item?.isExplicit === true);

const isPlayableSong = (item) =>
  Boolean(item?.videoId || item?.id || item?.url || item?.permalink);

// Returns both the score and the dominant match tier (for did-you-mean UX).
export const scoreItem = ({
  item,
  query,
  kind = inferKind(item),
  isFavorite = false,
  recencyIndex = -1,
  currentArtist = '',
  historyArtistCounts = null,
  recentSearchTerms = null,
  currentYear = new Date().getFullYear(),
}) => {
  const parsed = typeof query === 'string' ? parseQuery(query) : query;
  const qNorm = parsed?.termsNormalized || '';
  const qTokens = parsed?.tokens || [];
  const qPhrases = parsed?.phrases || [];
  const intent = parsed?.intent || emptyIntent();

  const nameNorm = normalize(getPrimaryText(item, kind));
  const artistNorm = normalize(getArtistText(item, kind));
  const albumNorm = normalize(getAlbumText(item));
  const haystack = [nameNorm, artistNorm, albumNorm].filter(Boolean).join(' ');

  let score = 0;
  let match = 'none';

  if (qNorm || qTokens.length > 0 || qPhrases.length > 0) {
    if (qNorm && nameNorm === qNorm) {
      score += 1000;
      match = 'exact';
    } else if (qNorm && nameNorm.startsWith(qNorm)) {
      score += 600;
      match = 'prefix';
    } else if (allTokensIn(qTokens, nameNorm)) {
      score += 320;
      match = 'tokens';
    } else if (qNorm && nameNorm.includes(qNorm)) {
      score += 220;
      match = 'contains';
    } else if (allTokensIn(qTokens, haystack)) {
      score += 250;
      match = 'composite';
    } else if (qNorm) {
      const fuzzyCandidates = [
        nameNorm,
        ...tokenize(nameNorm),
        ...tokenize(artistNorm),
        ...tokenize(albumNorm),
      ].filter(Boolean);
      const { distance, threshold } = bestFuzzyDistance(qNorm, fuzzyCandidates);
      if (distance <= threshold) {
        score += 120 - distance * 22;
        match = 'fuzzy';
      }
    }

    for (const phrase of qPhrases) {
      if (!phrase) continue;
      if (nameNorm.includes(phrase)) score += 140;
      else if (haystack.includes(phrase)) score += 75;
    }

    if (qNorm && qNorm.length >= 2 && qNorm.length <= 5) {
      const nameAcronym = acronymOf(nameNorm);
      const artistAcronym = acronymOf(artistNorm);
      if (nameAcronym && nameAcronym === qNorm) {
        score += 170;
        if (match === 'none') match = 'acronym';
      } else if (artistAcronym && artistAcronym === qNorm) {
        score += 130;
        if (match === 'none') match = 'acronym';
      }
    }

    const artistHits = hitCount(qTokens, artistNorm);
    if (artistHits > 0) score += 50 + artistHits * 8;

    const albumHits = hitCount(qTokens, albumNorm);
    if (albumHits > 0) score += 20 + albumHits * 4;
  } else if (parsed?.hasFilters) {
    score += 180;
    match = 'filter';
  }

  // Aliases ("MJ" -> "Michael Jackson") and abbreviations ("rmx" -> "remix")
  // widen lexical matching so the user's shorthand still surfaces the
  // canonical content. The boost mostly helps when the original lexical
  // pass missed; clamp it well below an exact-title match.
  const aliasBonus = aliasMatchScore(intent.aliasTerms, nameNorm, artistNorm);
  if (aliasBonus > 0) {
    score += aliasBonus;
    if (match === 'none') match = 'alias';
  }
  const abbreviationBonus = abbreviationMatchScore(
    intent.abbreviationTokens,
    nameNorm,
    albumNorm,
  );
  if (abbreviationBonus > 0) {
    score += abbreviationBonus;
    if (match === 'none') match = 'abbreviation';
  }

  // Intent boosts (live / acoustic / remix / official / etc). Each unique hit
  // adds INTENT_HIT, capped at 3 hits to prevent stacking.
  if (intent.intentTokens?.length) {
    let hits = 0;
    for (const token of intent.intentTokens) {
      if (intentMatchesCandidate(token, item, kind)) {
        hits += 1;
        if (hits >= 3) break;
      }
    }
    if (hits > 0) score += hits * WEIGHTS.INTENT_HIT;
  }

  if (isFavorite) score += 90;
  if (isFiniteNumber(recencyIndex) && recencyIndex >= 0) {
    score += Math.max(0, 80 - recencyIndex * 2);
  }

  const currentArtistNorm = normalize(currentArtist);
  if (currentArtistNorm && artistNorm && artistNorm === currentArtistNorm) {
    score += 30;
  }

  // Personalization: artists the user listens to often + queries they've run
  // recently get a small upweight. Popular evergreen hits aren't penalized;
  // these signals merely break ties in the user's favor.
  const affinity = artistAffinityBoost(artistNorm, historyArtistCounts);
  if (affinity > 0) score += affinity;
  const recentSearch = recentSearchBoost(recentSearchTerms, nameNorm, artistNorm);
  if (recentSearch > 0) score += recentSearch;

  // Year recency: songs / albums released in the last ~24 months get a mild
  // boost; older catalog hits stay neutral so we don't bury timeless tracks.
  if (kind !== 'artist') {
    const yearBoost = recentReleaseBoost(item, currentYear);
    if (yearBoost > 0) score += yearBoost;
  }

  // Playable / explicit handling (slice 3).
  if (kind === 'song' && !isPlayableSong(item)) {
    score -= WEIGHTS.PLAYABLE_PENALTY;
  }
  if (intent.blockExplicit && isExplicit(item)) {
    score -= WEIGHTS.EXPLICIT_PENALTY;
  } else if (intent.requireExplicit && isExplicit(item)) {
    score += 25;
  }

  if (kind === 'song') score += 5;
  if (kind === 'artist') score += 2;

  // Popularity is purely additive — it boosts famous content but doesn't
  // override a strong lexical match (an `exact` title is still 1000pt). The
  // returned `popularity` is preserved alongside `score` so the rescue
  // logic in `rankAndMerge` can rescue famous songs from the score floor and
  // tie-breaks can lean on it.
  const popularity = popularityScore(item);
  score += popularity;

  return { score, match, popularity };
};

const withDecorators = (candidate) => ({
  ...candidate.item,
  _score: candidate.score,
  _match: candidate.match,
  _kind: candidate.kind,
  _popularity: candidate.popularity || 0,
  _fromLibrary: candidate.isFromLibrary,
  _librarySources: Array.from(candidate.librarySources),
});

const selectDidYouMean = (parsed, candidates, top) => {
  const qNorm = parsed?.termsNormalized || '';
  if (!qNorm) return null;
  if (!top) return null;
  // If we already have a strong non-fuzzy match, don't distract with suggestions.
  if (top.match !== 'fuzzy' && top.score >= 220) return null;

  const threshold = qNorm.length <= 6 ? 2 : 3;
  let best = null;
  let bestDist = Infinity;
  let bestLibraryBoost = -1;

  for (const c of candidates) {
    const label = getPrimaryText(c.item, c.kind);
    if (!label) continue;
    const normLabel = normalize(label);
    const tokenDistances = tokenize(normLabel).map((t) =>
      levenshtein(qNorm, t, threshold),
    );
    const d = Math.min(
      levenshtein(qNorm, normLabel, threshold),
      ...tokenDistances,
    );
    if (d > threshold) continue;

    const libraryBoost = c.isFromLibrary ? 1 : 0;
    if (
      d < bestDist ||
      (d === bestDist && libraryBoost > bestLibraryBoost)
    ) {
      bestDist = d;
      best = label;
      bestLibraryBoost = libraryBoost;
    }
  }

  if (!best) return null;
  if (normalize(best) === qNorm) return null;
  return best;
};

const flattenPlaylistTracks = (playlists) => {
  const tracks = [];
  for (const p of playlists || []) {
    for (const t of p?.tracks || []) {
      tracks.push({
        ...t,
        _playlistId: p.id,
        _playlistName: p.name,
      });
    }
  }
  return tracks;
};

const matchesArtistFilter = (candidate, artistFilterNorm) => {
  if (!artistFilterNorm) return true;
  const artistNorm = normalize(getArtistText(candidate.item, candidate.kind));
  return Boolean(artistNorm && artistNorm.includes(artistFilterNorm));
};

const matchesAlbumFilter = (candidate, albumFilterNorm) => {
  if (!albumFilterNorm) return true;
  const albumNorm = normalize(getAlbumText(candidate.item));
  return Boolean(albumNorm && albumNorm.includes(albumFilterNorm));
};

const matchesTypeFilter = (candidate, typeFilter) => {
  if (!typeFilter) return true;
  return candidate.kind === typeFilter;
};

const matchesAllComparators = (value, filterOrArray) => {
  if (!filterOrArray) return true;
  const list = Array.isArray(filterOrArray) ? filterOrArray : [filterOrArray];
  for (const f of list) {
    if (!compareNumeric(value, f)) return false;
  }
  return true;
};

const matchesYearFilter = (candidate, yearFilter) => {
  if (!yearFilter) return true;
  const year = parseItemYear(candidate.item);
  // Year metadata is missing on a lot of upstream tracks. Don't drop them
  // when the user has set a year filter — only drop items whose declared
  // year is outside the range.
  if (!isFiniteNumber(year)) return true;
  return matchesAllComparators(year, yearFilter);
};

const matchesDurationFilter = (candidate, durationFilter) => {
  if (!durationFilter) return true;
  const seconds = parseItemDuration(candidate.item);
  if (!isFiniteNumber(seconds)) return true;
  return matchesAllComparators(seconds, durationFilter);
};

const matchesNegativeTokens = (candidate, negativeTokens) => {
  if (!negativeTokens?.length) return true;
  const haystack = normalize(
    [
      getPrimaryText(candidate.item, candidate.kind),
      getArtistText(candidate.item, candidate.kind),
      getAlbumText(candidate.item),
    ]
      .filter(Boolean)
      .join(' '),
  );
  return !negativeTokens.some((t) => haystack.includes(t));
};

const toHistoryIndexMap = (history) => {
  const m = new Map();
  (history || []).forEach((t, i) => {
    const key = t?.videoId || t?.id;
    if (key && !m.has(key)) m.set(key, i);
  });
  return m;
};

const toFavoriteSet = (favorites) => {
  const ids = new Set();
  (favorites || []).forEach((t) => {
    if (t?.id) ids.add(t.id);
    if (t?.videoId) ids.add(t.videoId);
  });
  return ids;
};

const numericRecency = (idx) =>
  isFiniteNumber(idx) && idx >= 0 ? idx : Number.POSITIVE_INFINITY;

// Build a bias key used by the SONG-vs-VIDEO de-dup pass. Two candidates with
// the same `(title, artist)` but different `kind` only differ by source
// (catalog vs UGC). The video version is suppressed when its song twin is
// present so the user doesn't see noisy lyric / cover videos pushed up.
const kindDupKey = (item) => {
  const title = normalize(item?.title || item?.name || '');
  const artist = normalize(item?.artist || '');
  return `${title}::${artist}`;
};

const SORT_TIE_BREAKERS = {
  relevance: (a, b) => 0,
  popularity: (a, b) => (b.popularity || 0) - (a.popularity || 0),
  newest: (a, b) => {
    const ay = parseItemYear(a.item) || 0;
    const by = parseItemYear(b.item) || 0;
    return by - ay;
  },
  shortest: (a, b) => {
    const ad = parseItemDuration(a.item);
    const bd = parseItemDuration(b.item);
    if (!isFiniteNumber(ad) && !isFiniteNumber(bd)) return 0;
    if (!isFiniteNumber(ad)) return 1;
    if (!isFiniteNumber(bd)) return -1;
    return ad - bd;
  },
};

export const rankAndMerge = ({
  query,
  serverResults = [],
  favorites = [],
  history = [],
  playlists = [],
  currentArtist = '',
  limit = DEFAULT_LIMIT,
  historyArtistCounts = null,
  recentSearchTerms = null,
  sortHint = null,
  currentYear = new Date().getFullYear(),
} = {}) => {
  const parsed = typeof query === 'string' ? parseQuery(query) : query;
  const hasQuery = Boolean(
    parsed?.termsNormalized ||
      parsed?.tokens?.length ||
      parsed?.phrases?.length ||
      parsed?.negativeTokens?.length ||
      parsed?.hasFilters,
  );
  if (!hasQuery) return emptyResult();

  const playlistTracks = flattenPlaylistTracks(playlists);
  const favoriteIds = toFavoriteSet(favorites);
  const historyIndexMap = toHistoryIndexMap(history);
  const candidates = [];

  const ingest = (raw, source, sourceMeta = {}) => {
    const candidate = normalizeCandidate(raw, source, sourceMeta);
    const idKey = candidate.item.videoId || candidate.item.id;
    const historyIdx =
      idKey !== undefined ? historyIndexMap.get(idKey) : undefined;
    const isFavorite = Boolean(
      favoriteIds.has(candidate.item.id) ||
        favoriteIds.has(candidate.item.videoId) ||
        source === 'favorite',
    );

    candidates.push({
      ...candidate,
      isFromLibrary: source !== 'server',
      isFavorite,
      recencyIndex: isFiniteNumber(historyIdx) ? historyIdx : -1,
      librarySources: new Set(source === 'server' ? [] : [source]),
      score: 0,
      match: 'none',
    });
  };

  (serverResults || []).forEach((r) => ingest(r, 'server'));
  (favorites || []).forEach((r) => ingest(r, 'favorite'));
  (history || []).forEach((r) => ingest(r, 'history'));
  playlistTracks.forEach((r) =>
    ingest(r, 'playlist', {
      playlistId: r._playlistId,
      playlistName: r._playlistName,
    }),
  );

  const artistFilterNorm = parsed?.filtersNormalized?.artist || '';
  const albumFilterNorm = parsed?.filtersNormalized?.album || '';
  const typeFilter = parsed?.filters?.type || '';
  const yearFilter = parsed?.filters?.year || null;
  const durationFilter = parsed?.filters?.duration || null;
  const negativeTokens = parsed?.negativeTokens || [];
  const intent = parsed?.intent || emptyIntent();
  const blockExplicit = Boolean(intent.blockExplicit);

  const scored = [];
  for (const candidate of candidates) {
    if (!matchesTypeFilter(candidate, typeFilter)) continue;
    if (!matchesArtistFilter(candidate, artistFilterNorm)) continue;
    if (!matchesAlbumFilter(candidate, albumFilterNorm)) continue;
    if (!matchesYearFilter(candidate, yearFilter)) continue;
    if (!matchesDurationFilter(candidate, durationFilter)) continue;
    if (!matchesNegativeTokens(candidate, negativeTokens)) continue;
    // `clean` keyword filters explicit content out entirely (a pure score
    // penalty would still leak the row near the top when the lexical match
    // was very strong). Hard filter is the user-friendlier behavior.
    if (blockExplicit && isExplicit(candidate.item)) continue;

    const { score, match, popularity } = scoreItem({
      item: candidate.item,
      query: parsed,
      kind: candidate.kind,
      isFavorite: candidate.isFavorite,
      recencyIndex: candidate.recencyIndex,
      currentArtist,
      historyArtistCounts,
      recentSearchTerms,
      currentYear,
    });
    candidate.score = score;
    candidate.match = match;
    candidate.popularity = popularity || 0;
    // Lexical-only score for the soft floor calculation: subtract popularity
    // so the floor is applied to "did the text actually match" without being
    // gamed by famous-but-irrelevant items.
    candidate.lexicalScore = score - (popularity || 0);
    scored.push(candidate);
  }

  // SONG > VIDEO de-dup: when a candidate's twin (same title, same artist)
  // exists as a `kind:'song'` row, suppress the video version so we don't
  // surface lyric / fan-cover videos above the official catalog entry.
  const songKindKeys = new Set();
  for (const c of scored) {
    if (c.kind === 'song' && c.item?.kind === 'song') {
      songKindKeys.add(kindDupKey(c.item));
    }
  }
  if (songKindKeys.size) {
    for (const c of scored) {
      if (
        c.kind === 'song' &&
        c.item?.kind === 'video' &&
        songKindKeys.has(kindDupKey(c.item))
      ) {
        c.score = Math.max(0, c.score - WEIGHTS.KIND_DUP_BIAS);
      }
    }
  }

  const effectiveSort = normalizeSortHint(sortHint || intent.sortHint) || 'relevance';
  const tieBreaker = SORT_TIE_BREAKERS[effectiveSort] || SORT_TIE_BREAKERS.relevance;

  scored.sort((a, b) => {
    if (effectiveSort === 'popularity' || effectiveSort === 'newest' || effectiveSort === 'shortest') {
      const primary = tieBreaker(a, b);
      if (primary !== 0) return primary;
    }
    if (b.score !== a.score) return b.score - a.score;
    // Popularity is the next strongest tie-breaker so two items with equal
    // total score (e.g. both `tokens` matches) order by global fame.
    if ((b.popularity || 0) !== (a.popularity || 0)) {
      return (b.popularity || 0) - (a.popularity || 0);
    }
    if (Number(b.isFromLibrary) !== Number(a.isFromLibrary)) {
      return Number(b.isFromLibrary) - Number(a.isFromLibrary);
    }
    const recencyDiff = numericRecency(a.recencyIndex) - numericRecency(b.recencyIndex);
    if (recencyDiff !== 0) return recencyDiff;
    const kindBias = { song: 3, artist: 2, album: 1 };
    if ((kindBias[b.kind] || 0) !== (kindBias[a.kind] || 0)) {
      return (kindBias[b.kind] || 0) - (kindBias[a.kind] || 0);
    }
    return countDefined(b.item) - countDefined(a.item);
  });

  // Dedupe after scoring so we keep the highest-scored duplicate.
  const dedupedMap = new Map();
  for (const candidate of scored) {
    const key = dedupeKey(candidate.item, candidate.kind);
    const existing = dedupedMap.get(key);
    if (!existing) {
      dedupedMap.set(key, candidate);
      continue;
    }

    existing.item = pickRicher(existing.item, candidate.item);
    existing.isFromLibrary = existing.isFromLibrary || candidate.isFromLibrary;
    existing.isFavorite = existing.isFavorite || candidate.isFavorite;
    existing.recencyIndex = Math.min(
      numericRecency(existing.recencyIndex),
      numericRecency(candidate.recencyIndex),
    );
    if (!isFiniteNumber(existing.recencyIndex)) existing.recencyIndex = -1;
    candidate.librarySources.forEach((s) => existing.librarySources.add(s));
    if (existing.match === 'none' && candidate.match !== 'none') {
      existing.match = candidate.match;
    }
  }

  const deduped = Array.from(dedupedMap.values());

  const hasTextQuery = Boolean(
    parsed?.termsNormalized || parsed?.tokens?.length || parsed?.phrases?.length,
  );
  let filtered = deduped;
  if (hasTextQuery) {
    // The score floor was tuned for songs, whose titles usually overlap the
    // query text. Artists and albums returned from the backend are pre-vetted
    // by the type-specific search upstream, so we keep them in the result
    // even when the user's query (e.g. a song title) doesn't lexically match
    // the artist or album name. Songs still go through the floor since they
    // can come from many noisier sources (history, playlists, broad video
    // search) where relevance can't be assumed — but we rescue songs whose
    // *popularity* signal is strong enough (top YTM hits, famous tracks)
    // so a typo like "blindng lights" still surfaces "Blinding Lights".
    filtered = deduped.filter((c) => {
      if (c.kind !== 'song') return true;
      if ((c.lexicalScore ?? c.score) >= SCORE_FLOOR) return true;
      // Popularity rescue: famous songs that survive lexical-floor failure.
      return (c.popularity || 0) >= WEIGHTS.POPULARITY_RESCUE;
    });
    if (filtered.length === 0 && deduped.length > 0) filtered = [deduped[0]];
  }

  const max = Math.max(1, limit || DEFAULT_LIMIT);
  const limited = filtered.slice(0, max);

  const songs = [];
  const artists = [];
  const albums = [];
  for (const candidate of limited) {
    const out = withDecorators(candidate);
    if (candidate.kind === 'artist') artists.push(out);
    else if (candidate.kind === 'album') albums.push(out);
    else songs.push(out);
  }

  const library = filtered
    .filter((c) => c.kind === 'song' && c.isFromLibrary)
    .slice(0, max)
    .map(withDecorators);

  const songExact = songs.filter((song) => EXACT_SONG_MATCH_TIERS.has(song._match));
  const songRelated = songs.filter((song) => !EXACT_SONG_MATCH_TIERS.has(song._match));

  const topCandidate = filtered[0] || null;
  const top = topCandidate ? withDecorators(topCandidate) : null;
  const didYouMean = selectDidYouMean(parsed, filtered, topCandidate);

  return {
    top,
    songs,
    songExact,
    songRelated,
    artists,
    albums,
    library,
    didYouMean,
    all: limited.map(withDecorators),
    activeFilters: {
      artist: parsed?.filters?.artist || null,
      album: parsed?.filters?.album || null,
      type: parsed?.filters?.type || null,
      year: parsed?.filters?.year || null,
      duration: parsed?.filters?.duration || null,
      sort: effectiveSort !== 'relevance' ? effectiveSort : null,
      cleanOnly: intent.blockExplicit ? true : null,
      explicitOnly: intent.requireExplicit ? true : null,
    },
    intent,
    sortHint: effectiveSort,
  };
};

