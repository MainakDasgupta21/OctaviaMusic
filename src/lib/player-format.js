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

// =============================================================================
// OS media-notification formatting.
// YouTube-sourced titles carry noise ("(Official Video)", "[Lyric Video]",
// trailing channel tags, a duplicated "Artist - " prefix). The lock screen /
// notification-shade player reads better when it shows a clean "Song" + "Artist"
// the way Spotify / Apple Music / YT Music do, so we scrub the metadata we hand
// to the Media Session API here. This intentionally only affects the OS media
// UI — in-app surfaces keep the original title.
// =============================================================================

// Bracketed descriptors we want to drop from a media title. Deliberately keeps
// "(feat. …)" / "(with …)" since those are part of the song, not video noise.
const TITLE_NOISE_RE =
  /\s*[([][^)\]]*\b(?:official|oficial|video|v[ií]deo|audio|[áa]udio|lyrics?|letra|visuali[sz]er|m\/?v|hd|4k|hq|explicit|clean|radio edit|remaster(?:ed)?|colou?r\s*coded|performance|live)\b[^)\]]*[)\]]/gi;

export const cleanTrackTitle = (rawTitle, artist = '') => {
  const original = String(rawTitle || '').trim();
  if (!original) return '';

  let t = original.replace(TITLE_NOISE_RE, '');

  // Drop trailing "| channel / extra" segments.
  t = t.replace(/\s*\|\s*.*$/, '');

  // "Artist - Song" / "Song - Artist": when we already know the artist (shown
  // on its own line in the notification), strip the duplicated half.
  const a = String(artist || '').trim().toLowerCase();
  if (a) {
    const parts = t.split(/\s+[-–—]\s+/);
    if (parts.length === 2) {
      const [left, right] = parts.map((p) => p.trim());
      if (left.toLowerCase() === a) t = right;
      else if (right.toLowerCase() === a) t = left;
    }
  }

  // Tidy leftover whitespace and dangling separators.
  t = t.replace(/\s{2,}/g, ' ').replace(/^\s*[-–—|]\s*|\s*[-–—|]\s*$/g, '').trim();

  return t || original;
};

export const cleanArtistName = (rawArtist) => {
  const original = String(rawArtist || '').trim();
  if (!original) return '';
  const cleaned = original
    .replace(/\s*-\s*topic$/i, '') // YouTube auto-generated artist channels
    .replace(/\s*VEVO$/i, '')
    .trim();
  return cleaned || original;
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
