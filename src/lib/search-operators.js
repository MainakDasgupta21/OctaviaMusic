// =============================================================================
// String helpers for round-tripping search filter operators through the URL
// `?q=` parameter. The SearchFilters panel reads parsed filter state and
// writes back via these helpers so the URL stays the source of truth and
// users can share the exact filtered query.
// =============================================================================

const collapseSpaces = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

const PATTERNS = {
  yearAll: /\byear(?::|<=|>=|<|>|=)\s*\d+\b/gi,
  durationAll: /\bduration(?::|<=|>=|<|>|=)\s*\d+(?::\d+)?\b/gi,
  sort: /\bsort:[a-z]+\b/gi,
  type: /\btype:(?:song|artist|album)\b/gi,
};

const stripPattern = (query, pattern) =>
  collapseSpaces(query.replace(pattern, ' '));

const stripWord = (query, word) => {
  const re = new RegExp(`(?:^|\\s)-?${word}(?=\\s|$)`, 'gi');
  return collapseSpaces(query.replace(re, ' '));
};

export const stripYearFilters = (query) => stripPattern(query, PATTERNS.yearAll);
export const stripDurationFilters = (query) => stripPattern(query, PATTERNS.durationAll);
export const stripSortFilter = (query) => stripPattern(query, PATTERNS.sort);
export const stripTypeFilter = (query) => stripPattern(query, PATTERNS.type);

export const setYearRange = (query, fromYear, toYear) => {
  let next = stripYearFilters(query);
  if (Number.isFinite(fromYear)) next = collapseSpaces(`${next} year>=${fromYear}`);
  if (Number.isFinite(toYear)) next = collapseSpaces(`${next} year<=${toYear}`);
  return next;
};

export const setDurationMax = (query, maxSeconds) => {
  const next = stripDurationFilters(query);
  if (!Number.isFinite(maxSeconds) || maxSeconds <= 0) return next;
  return collapseSpaces(`${next} duration<=${Math.round(maxSeconds)}`);
};

export const setSort = (query, sort) => {
  const next = stripSortFilter(query);
  if (!sort || sort === 'relevance') return next;
  return collapseSpaces(`${next} sort:${sort}`);
};

export const setTypeFilter = (query, type) => {
  const next = stripTypeFilter(query);
  if (!type || type === 'all') return next;
  return collapseSpaces(`${next} type:${type}`);
};

export const toggleKeyword = (query, keyword, on) => {
  const stripped = stripWord(query, keyword);
  if (!on) return stripped;
  return collapseSpaces(`${stripped} ${keyword}`);
};

// Read the lower / upper bound from an array of `{op, value}` year filters.
export const yearBounds = (yearFilters) => {
  if (!Array.isArray(yearFilters) || yearFilters.length === 0) {
    return { from: null, to: null };
  }
  let from = null;
  let to = null;
  for (const f of yearFilters) {
    if (!f || !Number.isFinite(f.value)) continue;
    if (f.op === '>=' || f.op === '>') {
      const v = f.op === '>' ? f.value + 1 : f.value;
      from = from == null ? v : Math.max(from, v);
    } else if (f.op === '<=' || f.op === '<') {
      const v = f.op === '<' ? f.value - 1 : f.value;
      to = to == null ? v : Math.min(to, v);
    } else if (f.op === '=') {
      from = f.value;
      to = f.value;
    }
  }
  return { from, to };
};

export const durationMax = (durationFilters) => {
  if (!Array.isArray(durationFilters) || durationFilters.length === 0) return null;
  let max = null;
  for (const f of durationFilters) {
    if (!f || !Number.isFinite(f.value)) continue;
    if (f.op === '<=' || f.op === '<' || f.op === '=') {
      const v = f.op === '<' ? f.value - 1 : f.value;
      max = max == null ? v : Math.min(max, v);
    }
  }
  return max;
};
