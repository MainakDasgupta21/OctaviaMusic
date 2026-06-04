// =============================================================================
// Single source of truth for slug rules.
// All artist routing must go through `artistSlugFromName` or `artistSlugOf`.
// =============================================================================

const YT_CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{20,}$/;

const stripDiacritics = (value) =>
  String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const slugify = (value) =>
  stripDiacritics(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const artistSlugFromName = (name) => slugify(name || '');

// Prefer the canonical API slug, otherwise derive from the artist name.
// Returns an empty string when no usable slug can be produced.
export const artistSlugOf = (track) => {
  if (!track) return '';
  if (track.artistSlug && typeof track.artistSlug === 'string') {
    return track.artistSlug.trim();
  }
  if (track.slug && typeof track.slug === 'string') return track.slug.trim();
  return artistSlugFromName(track.artist || track.name || '');
};

// True when the slug looks like a YTM channel id (UC...). Pages that build
// /artist/:slug links can rely on this to decide between deep-linking and
// disabling the link until canonical metadata arrives.
export const isYouTubeChannelId = (value) =>
  typeof value === 'string' && YT_CHANNEL_ID_RE.test(value.trim());

// True when the value can safely be used as an artist URL segment.
// Filters out empty strings and falsy values.
export const isUsableArtistSlug = (value) =>
  typeof value === 'string' && value.trim().length > 0;

export default {
  slugify,
  artistSlugFromName,
  artistSlugOf,
  isYouTubeChannelId,
  isUsableArtistSlug,
};
