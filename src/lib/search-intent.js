// =============================================================================
// Query intent detection. The user's raw query is more than a bag of words —
// it carries hints about what *version* they want ("blinding lights live"),
// preferred sort ("sort:newest"), explicit / clean preferences, and
// abbreviation-friendly aliases ("MJ", "rmx"). This module extracts those
// signals so the ranker can boost matching candidates without polluting
// `parseQuery` with scoring concerns.
// =============================================================================

import { collectExpansions } from './search-aliases';

const INTENT_KEYWORDS = new Set([
  'live',
  'acoustic',
  'remix',
  'official',
  'instrumental',
  'cover',
  'karaoke',
  'unplugged',
  'extended',
  'lofi',
]);

const FEAT_PATTERN = /\b(feat|featuring|ft)\b/i;
const CLEAN_PATTERN = /\bclean\b/i;
const EXPLICIT_PATTERN = /\bexplicit\b/i;

const SORT_PATTERNS = {
  popularity: /\bsort:popular(?:ity)?\b/i,
  newest: /\bsort:(?:newest|new|latest)\b/i,
  shortest: /\bsort:short(?:est)?\b/i,
  relevance: /\bsort:relevance\b/i,
};

export const detectSortHint = (raw) => {
  if (!raw) return null;
  if (SORT_PATTERNS.popularity.test(raw)) return 'popularity';
  if (SORT_PATTERNS.newest.test(raw)) return 'newest';
  if (SORT_PATTERNS.shortest.test(raw)) return 'shortest';
  if (SORT_PATTERNS.relevance.test(raw)) return 'relevance';
  return null;
};

// Return a copy of the raw query with any `sort:*` operator stripped so the
// downstream tokenizer doesn't treat them as positive terms.
export const stripSortHints = (raw) => {
  if (!raw) return '';
  let next = raw;
  for (const pattern of Object.values(SORT_PATTERNS)) {
    next = next.replace(pattern, ' ');
  }
  return next.replace(/\s+/g, ' ').trim();
};

export const expandIntent = ({ tokens = [], terms = '', raw = '' } = {}) => {
  const seen = new Set();
  const intentTokens = [];
  for (const token of tokens) {
    const t = String(token || '').toLowerCase();
    if (!t || seen.has(t)) continue;
    if (INTENT_KEYWORDS.has(t)) {
      seen.add(t);
      intentTokens.push(t);
    }
  }

  // `feat` / `featuring` / `ft` aren't in the keyword set above (they double
  // as positive lexical matches against a song title's "feat. X" suffix) but
  // we still tag them as an intent so the ranker can boost collab tracks.
  if (FEAT_PATTERN.test(terms || raw) && !intentTokens.includes('feat')) {
    intentTokens.push('feat');
  }

  const { aliasTerms, abbreviationTokens } = collectExpansions(tokens);
  const sortHint = detectSortHint(raw || terms);
  const blockExplicit = CLEAN_PATTERN.test(terms || raw);
  const requireExplicit = EXPLICIT_PATTERN.test(terms || raw);

  return {
    intentTokens,
    aliasTerms,
    abbreviationTokens,
    sortHint,
    blockExplicit: blockExplicit ? true : null,
    requireExplicit: requireExplicit ? true : null,
  };
};

export const emptyIntent = () => ({
  intentTokens: [],
  aliasTerms: [],
  abbreviationTokens: [],
  sortHint: null,
  blockExplicit: null,
  requireExplicit: null,
});

export { INTENT_KEYWORDS };
