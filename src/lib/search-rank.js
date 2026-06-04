// =============================================================================
// Search ranking core.
// One place decides "what is a good hit" across TopBar, /search and Cmd+K.
// =============================================================================

const SCORE_FLOOR = 60;
const DEFAULT_LIMIT = 24;
const TYPE_VALUES = new Set(['song', 'artist', 'album']);
const EXACT_SONG_MATCH_TIERS = new Set(['exact', 'prefix']);

const isFiniteNumber = (v) => Number.isFinite(v);

const firstFinite = (...values) => values.find((v) => isFiniteNumber(v));

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
});

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

const hasFilterValues = (filters) =>
  Boolean(
    filters?.artist ||
      filters?.album ||
      filters?.type ||
      filters?.year ||
      filters?.duration,
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
    };
  }

  const filters = {};
  let rest = source;

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

  const yearFilter = consumeComparatorFilter(rest, 'year', parseYearValue);
  if (yearFilter.value) {
    filters.year = yearFilter.value;
    rest = yearFilter.rest;
  }

  const durationFilter = consumeComparatorFilter(rest, 'duration', parseDurationSeconds);
  if (durationFilter.value) {
    filters.duration = durationFilter.value;
    rest = durationFilter.rest;
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

// Returns both the score and the dominant match tier (for did-you-mean UX).
export const scoreItem = ({
  item,
  query,
  kind = inferKind(item),
  isFavorite = false,
  recencyIndex = -1,
  currentArtist = '',
}) => {
  const parsed = typeof query === 'string' ? parseQuery(query) : query;
  const qNorm = parsed?.termsNormalized || '';
  const qTokens = parsed?.tokens || [];
  const qPhrases = parsed?.phrases || [];

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

  if (isFavorite) score += 90;
  if (isFiniteNumber(recencyIndex) && recencyIndex >= 0) {
    score += Math.max(0, 80 - recencyIndex * 2);
  }

  const currentArtistNorm = normalize(currentArtist);
  if (currentArtistNorm && artistNorm && artistNorm === currentArtistNorm) {
    score += 30;
  }

  if (kind === 'song') score += 5;
  if (kind === 'artist') score += 2;

  return { score, match };
};

const withDecorators = (candidate) => ({
  ...candidate.item,
  _score: candidate.score,
  _match: candidate.match,
  _kind: candidate.kind,
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

const matchesYearFilter = (candidate, yearFilter) => {
  if (!yearFilter) return true;
  const year = parseItemYear(candidate.item);
  return compareNumeric(year, yearFilter);
};

const matchesDurationFilter = (candidate, durationFilter) => {
  if (!durationFilter) return true;
  const seconds = parseItemDuration(candidate.item);
  return compareNumeric(seconds, durationFilter);
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

export const rankAndMerge = ({
  query,
  serverResults = [],
  favorites = [],
  history = [],
  playlists = [],
  currentArtist = '',
  limit = DEFAULT_LIMIT,
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

  const scored = [];
  for (const candidate of candidates) {
    if (!matchesTypeFilter(candidate, typeFilter)) continue;
    if (!matchesArtistFilter(candidate, artistFilterNorm)) continue;
    if (!matchesAlbumFilter(candidate, albumFilterNorm)) continue;
    if (!matchesYearFilter(candidate, yearFilter)) continue;
    if (!matchesDurationFilter(candidate, durationFilter)) continue;
    if (!matchesNegativeTokens(candidate, negativeTokens)) continue;

    const { score, match } = scoreItem({
      item: candidate.item,
      query: parsed,
      kind: candidate.kind,
      isFavorite: candidate.isFavorite,
      recencyIndex: candidate.recencyIndex,
      currentArtist,
    });
    candidate.score = score;
    candidate.match = match;
    scored.push(candidate);
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
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
    // search) where relevance can't be assumed.
    filtered = deduped.filter(
      (c) => c.kind !== 'song' || c.score >= SCORE_FLOOR,
    );
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
    },
  };
};

