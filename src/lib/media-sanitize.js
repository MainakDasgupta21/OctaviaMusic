// =============================================================================
// Media data boundary. Every image URL and video id we hand to the DOM passes
// through here so we never blindly trust upstream payloads.
// =============================================================================

const YOUTUBE_VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const SAFE_IMAGE_HOSTS = new Set([
  'i.ytimg.com',
  'img.youtube.com',
  'yt3.ggpht.com',
  'yt3.googleusercontent.com',
  'lh3.googleusercontent.com',
  ...LOCAL_HOSTS,
]);

const PLACEHOLDERS = {
  track: '/placeholders/track.svg',
  album: '/placeholders/album.svg',
  artist: '/placeholders/artist.svg',
  genre: '/placeholders/genre.svg',
  mix: '/placeholders/mix.svg',
  'daily-mix': '/placeholders/daily-mix.svg',
};

const PLACEHOLDER_FALLBACK = PLACEHOLDERS.track;

export const pickPlaceholder = (kind = 'track') =>
  PLACEHOLDERS[kind] || PLACEHOLDER_FALLBACK;

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const isSameOrigin = (url) => {
  if (typeof window === 'undefined') return false;
  return url.origin === window.location.origin;
};

export const sanitizeVideoId = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return YOUTUBE_VIDEO_ID_RE.test(trimmed) ? trimmed : null;
};

// Returns a safe image URL or `fallback`. The fallback is intentionally
// pluggable so callers can choose a type-specific placeholder.
export const sanitizeImageUrl = (value, { fallback = null } = {}) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;

  if (trimmed.startsWith('/')) return trimmed;
  if (trimmed.startsWith('data:image/')) return trimmed;

  const url = toAbsoluteUrl(trimmed);
  if (!url) return fallback;

  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && LOCAL_HOSTS.has(url.hostname))) {
    return fallback;
  }

  if (!SAFE_IMAGE_HOSTS.has(url.hostname) && !isSameOrigin(url)) return fallback;

  // ytimg maxres thumbnails frequently 404 for many videos.
  if (
    (url.hostname === 'i.ytimg.com' || url.hostname === 'img.youtube.com')
    && url.pathname.endsWith('/maxresdefault.jpg')
  ) {
    url.pathname = url.pathname.replace('/maxresdefault.jpg', '/hqdefault.jpg');
    return url.toString();
  }

  return trimmed;
};

// Sanitizes a track DTO. By default a missing/invalid videoId is allowed —
// we keep the row visible but mark it `playable: false` so UI can disable the
// play button. Pass `requirePlayable: true` to drop unplayable rows entirely.
export const sanitizeTrack = (
  track,
  { requirePlayable = false, fallbackThumbnail = null } = {},
) => {
  if (!track || typeof track !== 'object') return null;

  const id = String(track.id || '').trim();
  if (!id) return null;

  const fallbackVideo = sanitizeVideoId(id);
  const videoId = sanitizeVideoId(track.videoId) || fallbackVideo || null;
  if (requirePlayable && !videoId) return null;

  const thumbnail = sanitizeImageUrl(track.thumbnail, { fallback: fallbackThumbnail });

  return {
    ...track,
    id,
    videoId,
    thumbnail,
    playable: track.playable !== false && Boolean(videoId),
  };
};

export const sanitizeTrackList = (rows, options) =>
  Array.isArray(rows)
    ? rows.map((row) => sanitizeTrack(row, options)).filter(Boolean)
    : [];

export const isSafeImageUrl = (value) => sanitizeImageUrl(value) != null;
