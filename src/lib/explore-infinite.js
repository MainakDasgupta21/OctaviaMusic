const normalize = (value) => String(value ?? '').trim().toLowerCase();

const idOf = (track) =>
  String(track?.id || track?.videoId || `${track?.title || ''}::${track?.artist || ''}`);

const artistOf = (track) => normalize(track?.artist || '');

export const normalizeFlowSeed = ({
  mood = '',
  genre = '',
  seed = '',
} = {}) => ({
  mood: normalize(mood),
  genre: normalize(genre),
  seed: normalize(seed),
});

export const mergeInfiniteSources = ({
  localPool = [],
  radioItems = [],
  similarItems = [],
} = {}) => {
  const seen = new Set();
  const out = [];
  for (const track of [...radioItems, ...similarItems, ...localPool]) {
    const key = idOf(track);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(track);
  }
  return out;
};

export const buildInfiniteBatch = ({
  pool = [],
  size = 12,
  cursor = 0,
  consumedIds = new Set(),
  maxPerArtist = 2,
} = {}) => {
  const items = [];
  const artistCount = new Map();
  const seen = new Set(consumedIds);

  let index = cursor;
  while (index < pool.length && items.length < size) {
    const track = pool[index];
    index += 1;
    const key = idOf(track);
    if (!key || seen.has(key)) continue;
    const artistKey = artistOf(track);
    const used = artistCount.get(artistKey) || 0;
    if (artistKey && used >= maxPerArtist) continue;
    seen.add(key);
    artistCount.set(artistKey, used + 1);
    items.push(track);
  }

  if (items.length < size && pool.length > 0) {
    for (let i = 0; i < pool.length && items.length < size; i += 1) {
      const track = pool[i];
      const key = idOf(track);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      items.push(track);
    }
  }

  return {
    items,
    nextCursor: index >= pool.length ? 0 : index,
    consumedIds: seen,
  };
};

export const buildFlowSharePayload = ({
  track = null,
  mood = '',
  genre = '',
} = {}) => {
  const title = track?.title || 'Infinite discovery flow';
  const artist = track?.artist || 'Unknown artist';
  const url =
    typeof window === 'undefined'
      ? '/explore/flow'
      : new URL('/explore/flow', window.location.origin).toString();
  return {
    title: `Now playing in Explore Flow: ${title}`,
    text: `Found this in Explore Flow: ${title} — ${artist}`,
    url: `${url}?mood=${encodeURIComponent(mood || '')}&genre=${encodeURIComponent(genre || '')}`,
  };
};

export default {
  normalizeFlowSeed,
  mergeInfiniteSources,
  buildInfiniteBatch,
  buildFlowSharePayload,
};
