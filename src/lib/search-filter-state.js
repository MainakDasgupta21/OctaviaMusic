// =============================================================================
// Structured filter state for the /search page.
//
// The visible search input (`?q=`) is reserved for what the user actually
// typed. Every structured filter — sort, year range, duration cap, artist
// scope, album scope, clean toggle, mood tags, exclusions — lives in its
// own URL param. composeQuery() folds the two back together into the
// synthetic operator string the existing parseQuery() ranker pipeline
// expects, so we never have to retrain the scorer on a new shape.
// =============================================================================

import {
  setAlbumFilter,
  setArtistFilter,
  setDurationMax,
  setNegativeToken,
  setSort,
  setYearRange,
  toggleKeyword,
} from '@/lib/search-operators';

export const VALID_SORTS = new Set(['relevance', 'popularity', 'newest', 'shortest']);
export const VALID_MOODS = new Set(['live', 'acoustic', 'remix', 'instrumental']);

// Shared range constants — exported so editors and the URL serializer
// agree on a single source of truth. If these drift, an editor will
// silently clip values that the URL/state layer happily round-trips.
//
// Duration is intentionally capped at 30 minutes: songs longer than that
// are virtually nonexistent in mainstream catalogs, and capping here lets
// the editor's slider use a usable per-pixel granularity instead of
// stretching across 100 minutes worth of dead range.
export const NOW = new Date().getFullYear();
export const MIN_YEAR = 1900;
export const MAX_YEAR = NOW;
export const MIN_DURATION = 60;
export const MAX_DURATION = 1800;

export const EMPTY_FILTERS = Object.freeze({
  sort: 'relevance',
  yearFrom: null,
  yearTo: null,
  durationMax: null,
  artist: '',
  album: '',
  clean: false,
  mood: [],
  exclude: [],
});

// Param name registry — kept in one place so writeFilters / filtersFromSearchParams
// stay symmetrical and we never accidentally read with one key and write with
// another.
const PARAM = Object.freeze({
  sort: 'sort',
  yearFrom: 'yearFrom',
  yearTo: 'yearTo',
  durationMax: 'duration',
  artist: 'artist',
  album: 'album',
  clean: 'clean',
  mood: 'mood',
  exclude: 'exclude',
});

const clampYear = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return null;
  if (num < MIN_YEAR || num > NOW + 1) return null;
  return Math.round(num);
};

const clampDuration = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return null;
  // Snap to whole minutes so the URL, the editor's slider step, and the
  // minute input never round-trip a value into a slightly different one.
  const minuteAligned = Math.round(num / 60) * 60;
  return Math.max(MIN_DURATION, Math.min(MAX_DURATION, minuteAligned));
};

const splitCsv = (raw) =>
  String(raw || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

const dedupe = (arr) => Array.from(new Set(arr));

export const filtersFromSearchParams = (searchParams) => {
  if (!searchParams) return { ...EMPTY_FILTERS };

  const sort = String(searchParams.get(PARAM.sort) || '').toLowerCase();
  const yearFrom = clampYear(searchParams.get(PARAM.yearFrom));
  const yearTo = clampYear(searchParams.get(PARAM.yearTo));
  const durationMax = clampDuration(searchParams.get(PARAM.durationMax));
  const artist = String(searchParams.get(PARAM.artist) || '').trim();
  const album = String(searchParams.get(PARAM.album) || '').trim();
  const clean = ['1', 'true', 'yes'].includes(
    String(searchParams.get(PARAM.clean) || '').toLowerCase(),
  );
  const mood = dedupe(splitCsv(searchParams.get(PARAM.mood))).filter((m) =>
    VALID_MOODS.has(m),
  );
  const exclude = dedupe(splitCsv(searchParams.get(PARAM.exclude)));

  return {
    sort: VALID_SORTS.has(sort) ? sort : 'relevance',
    yearFrom,
    yearTo,
    durationMax,
    artist,
    album,
    clean,
    mood,
    exclude,
  };
};

// Mutate `searchParams` in place so the caller can keep any unrelated keys
// (e.g. `?q=`, `?type=`) intact. Empty / default values are deleted so the
// URL stays minimal and shareable.
export const writeFiltersToSearchParams = (searchParams, filters) => {
  const f = { ...EMPTY_FILTERS, ...(filters || {}) };

  const setOrDelete = (key, value) => {
    if (value == null || value === '' || value === false) {
      searchParams.delete(key);
    } else {
      searchParams.set(key, String(value));
    }
  };

  setOrDelete(
    PARAM.sort,
    f.sort && f.sort !== 'relevance' ? f.sort : null,
  );
  setOrDelete(PARAM.yearFrom, Number.isFinite(f.yearFrom) ? f.yearFrom : null);
  setOrDelete(PARAM.yearTo, Number.isFinite(f.yearTo) ? f.yearTo : null);
  setOrDelete(
    PARAM.durationMax,
    Number.isFinite(f.durationMax) ? f.durationMax : null,
  );
  setOrDelete(PARAM.artist, f.artist || null);
  setOrDelete(PARAM.album, f.album || null);
  setOrDelete(PARAM.clean, f.clean ? '1' : null);
  setOrDelete(PARAM.mood, f.mood && f.mood.length ? f.mood.join(',') : null);
  setOrDelete(
    PARAM.exclude,
    f.exclude && f.exclude.length ? f.exclude.join(',') : null,
  );

  return searchParams;
};

// Build the synthetic operator string the existing parseQuery() consumes.
// composed = userText + " " + sort:* + " " + year:* + " " + duration:* + …
// This string is *internal only* — it must never be shown to the user.
export const composeQuery = (userText, filters) => {
  const f = { ...EMPTY_FILTERS, ...(filters || {}) };
  let composed = String(userText || '').trim();

  if (f.sort && f.sort !== 'relevance') composed = setSort(composed, f.sort);
  if (Number.isFinite(f.yearFrom) || Number.isFinite(f.yearTo)) {
    composed = setYearRange(
      composed,
      Number.isFinite(f.yearFrom) ? f.yearFrom : null,
      Number.isFinite(f.yearTo) ? f.yearTo : null,
    );
  }
  if (Number.isFinite(f.durationMax)) {
    composed = setDurationMax(composed, f.durationMax);
  }
  if (f.artist) composed = setArtistFilter(composed, f.artist);
  if (f.album) composed = setAlbumFilter(composed, f.album);
  if (f.clean) composed = toggleKeyword(composed, 'clean', true);
  for (const tag of f.mood || []) {
    composed = toggleKeyword(composed, tag, true);
  }
  for (const token of f.exclude || []) {
    composed = setNegativeToken(composed, token, true);
  }
  return composed;
};

export const hasAnyFilter = (filters) => {
  const f = { ...EMPTY_FILTERS, ...(filters || {}) };
  if (f.sort && f.sort !== 'relevance') return true;
  if (Number.isFinite(f.yearFrom)) return true;
  if (Number.isFinite(f.yearTo)) return true;
  if (Number.isFinite(f.durationMax)) return true;
  if (f.artist) return true;
  if (f.album) return true;
  if (f.clean) return true;
  if (f.mood && f.mood.length) return true;
  if (f.exclude && f.exclude.length) return true;
  return false;
};

export const filterCount = (filters) => {
  const f = { ...EMPTY_FILTERS, ...(filters || {}) };
  let n = 0;
  if (f.sort && f.sort !== 'relevance') n += 1;
  if (Number.isFinite(f.yearFrom) || Number.isFinite(f.yearTo)) n += 1;
  if (Number.isFinite(f.durationMax)) n += 1;
  if (f.artist) n += 1;
  if (f.album) n += 1;
  if (f.clean) n += 1;
  if (f.mood && f.mood.length) n += f.mood.length;
  if (f.exclude && f.exclude.length) n += f.exclude.length;
  return n;
};

// Immutable single-key update. UI code stays small: `setFilter(f, 'sort', 'newest')`
// rather than `{...f, sort: 'newest'}` everywhere.
export const setFilter = (filters, key, value) => ({
  ...EMPTY_FILTERS,
  ...(filters || {}),
  [key]: value,
});

// Remove a single dimension. Year is two keys so we wipe both atomically.
export const clearFilter = (filters, key) => {
  const next = { ...EMPTY_FILTERS, ...(filters || {}) };
  switch (key) {
    case 'sort':
      next.sort = 'relevance';
      break;
    case 'year':
      next.yearFrom = null;
      next.yearTo = null;
      break;
    case 'duration':
      next.durationMax = null;
      break;
    case 'artist':
      next.artist = '';
      break;
    case 'album':
      next.album = '';
      break;
    case 'clean':
      next.clean = false;
      break;
    case 'mood':
      next.mood = [];
      break;
    case 'exclude':
      next.exclude = [];
      break;
    default:
      if (key in next) next[key] = EMPTY_FILTERS[key];
  }
  return next;
};

export const toggleMood = (filters, tag) => {
  const t = String(tag || '').toLowerCase();
  if (!VALID_MOODS.has(t)) return filters;
  const current = (filters?.mood || []).slice();
  const idx = current.indexOf(t);
  if (idx === -1) current.push(t);
  else current.splice(idx, 1);
  return setFilter(filters, 'mood', current);
};

export const addExclude = (filters, token) => {
  const t = String(token || '').trim().toLowerCase().replace(/^-+/, '');
  if (!t) return filters;
  const current = filters?.exclude || [];
  if (current.includes(t)) return filters;
  return setFilter(filters, 'exclude', [...current, t]);
};

export const removeExclude = (filters, token) => {
  const t = String(token || '').toLowerCase();
  const current = filters?.exclude || [];
  return setFilter(filters, 'exclude', current.filter((x) => x !== t));
};

export const PARAM_KEYS = PARAM;
