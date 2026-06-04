// =============================================================================
// Shared now-playing formatting helpers.
// Single source of truth for the player surfaces (FooterPlayer + NowPlaying).
// =============================================================================

// "m:ss" from a seconds value. Defensive against NaN / negative / Infinity.
export const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Deterministic two-digit "issue number" for the editorial dateline.
// Stable for a given track so the same song always shows the same issue.
export const formatIssueNo = (track) => {
  if (!track) return '01';
  const source = `${track.id || ''}:${track.title || ''}:${track.artist || ''}`;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) | 0;
  }
  return String((Math.abs(hash) % 90) + 10).padStart(2, '0');
};

// Words we never want to italicize as the trailing "accent" — it reads odd to
// emphasize a preposition/article. We walk back to the last meaningful token.
const STOPWORDS = new Set([
  'a', 'an', 'and', 'the', 'of', 'to', 'in', 'on', 'for', 'with', 'at', 'by',
  'from', 'is', 'it', 'or', 'as', 'my', 'me', 'you', 'your', 'feat', 'feat.',
]);

// Split a title into { lead, accent } so the last *non-stopword* token can be
// rendered in the editorial italic accent. Short titles stay un-split.
export const splitHeadline = (title) => {
  const t = (title || '').trim();
  if (!t || t.length < 14) return { lead: t, accent: '' };

  const tokens = t.split(/\s+/);
  if (tokens.length < 2) return { lead: t, accent: '' };

  // Find the last token that isn't a stopword (compared without punctuation).
  let accentIdx = tokens.length - 1;
  while (accentIdx > 0) {
    const clean = tokens[accentIdx].toLowerCase().replace(/[^\w]/g, '');
    if (clean && !STOPWORDS.has(clean)) break;
    accentIdx -= 1;
  }
  if (accentIdx <= 0) return { lead: t, accent: '' };

  return {
    lead: tokens.slice(0, accentIdx).join(' '),
    accent: tokens.slice(accentIdx).join(' '),
  };
};

// Mirrors the slug rule used across the app for artist routes.
export const artistSlug = (track) =>
  track?.artistSlug ||
  (track?.artist || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// =============================================================================
// `formatPlays(value)` — turns a raw play-count into a short, human label
// (`1.2M`, `345K`, `9,820`). Returns the em-dash `'\u2014'` when the input is
// missing/non-numeric so list views can render a stable placeholder instead
// of `NaN` or `0`. Centralised here so Trending / Charts / Artist all read the
// same numbers the same way.
// =============================================================================
export const formatPlays = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return '\u2014';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 === 0 ? 0 : 1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
};
