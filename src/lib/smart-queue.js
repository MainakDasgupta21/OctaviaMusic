import { sanitizeTrackList } from '@/lib/media-sanitize';

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ');

const idOf = (track) => String(track?.id || track?.videoId || '').trim();
const artistKeyOf = (track) => normalize(track?.artist || '');
const albumKeyOf = (track) => normalize(track?.album || track?.albumTitle || '');

const toList = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(/[,|/]/g);
  return [];
};

const tokenize = (value) =>
  normalize(value)
    .split(' ')
    .filter((token) => token.length > 1);

const tokenSetFrom = (...values) => {
  const out = new Set();
  values.flat().forEach((value) => {
    tokenize(value).forEach((token) => out.add(token));
  });
  return out;
};

const overlapSize = (left, right) => {
  if (!left.size || !right.size) return 0;
  let count = 0;
  left.forEach((token) => {
    if (right.has(token)) count += 1;
  });
  return count;
};

const stableHash = (value) => {
  const text = String(value || '');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
};

const buildArtistAffinity = (history = []) => {
  const map = new Map();
  history.forEach((track, index) => {
    const key = artistKeyOf(track);
    if (!key) return;
    const recencyWeight = Math.max(1, 16 - index * 0.35);
    map.set(key, (map.get(key) || 0) + recencyWeight);
  });
  return map;
};

const scoreCandidate = ({
  candidate,
  seed,
  seedTokens,
  seedGenreTokens,
  seedMoodTokens,
  seedArtistKey,
  seedAlbumKey,
  artistAffinity,
}) => {
  const candidateId = idOf(candidate);
  if (!candidateId) return Number.NEGATIVE_INFINITY;

  const candidateArtist = artistKeyOf(candidate);
  const candidateAlbum = albumKeyOf(candidate);
  const candidateTokens = tokenSetFrom(
    candidate?.title,
    candidate?.artist,
    candidate?.album,
    candidate?.albumTitle,
  );
  const candidateGenreTokens = tokenSetFrom(toList(candidate?.genre), toList(candidate?.genres));
  const candidateMoodTokens = tokenSetFrom(
    toList(candidate?.mood),
    toList(candidate?.vibe),
    toList(candidate?.tags),
  );

  const sameArtistBonus = candidateArtist && candidateArtist === seedArtistKey ? 55 : 0;
  const sameAlbumBonus =
    candidateAlbum
    && seedAlbumKey
    && candidateAlbum === seedAlbumKey
      ? 22
      : 0;
  const titleTokenScore = overlapSize(seedTokens, candidateTokens) * 6;
  const genreScore = overlapSize(seedGenreTokens, candidateGenreTokens) * 14;
  const moodScore = overlapSize(seedMoodTokens, candidateMoodTokens) * 10;
  const affinityScore = (artistAffinity.get(candidateArtist) || 0) * 1.6;
  const tieBreaker = (stableHash(`${candidateId}:${seed?.id || ''}`) % 100) / 100;

  return (
    sameArtistBonus
    + sameAlbumBonus
    + titleTokenScore
    + genreScore
    + moodScore
    + affinityScore
    + tieBreaker
  );
};

export const buildSmartQueueFromSeed = ({
  seedTrack,
  remoteCandidates = [],
  localCandidates = [],
  history = [],
  limit = 24,
  maxPerArtist = 3,
} = {}) => {
  const seed = sanitizeTrackList([seedTrack], { requirePlayable: true })[0];
  if (!seed) return [];

  const pool = sanitizeTrackList(
    [...(remoteCandidates || []), ...(localCandidates || [])],
    { requirePlayable: true },
  );
  if (!pool.length) return [];

  const seedId = idOf(seed);
  const seenIds = new Set([seedId]);
  const seedArtistKey = artistKeyOf(seed);
  const seedAlbumKey = albumKeyOf(seed);
  const seedTokens = tokenSetFrom(seed?.title, seed?.artist, seed?.album, seed?.albumTitle);
  const seedGenreTokens = tokenSetFrom(toList(seed?.genre), toList(seed?.genres));
  const seedMoodTokens = tokenSetFrom(
    toList(seed?.mood),
    toList(seed?.vibe),
    toList(seed?.tags),
  );
  const artistAffinity = buildArtistAffinity(history);

  const ranked = [];
  for (const candidate of pool) {
    const candidateId = idOf(candidate);
    if (!candidateId || seenIds.has(candidateId)) continue;
    seenIds.add(candidateId);
    const score = scoreCandidate({
      candidate,
      seed,
      seedTokens,
      seedGenreTokens,
      seedMoodTokens,
      seedArtistKey,
      seedAlbumKey,
      artistAffinity,
    });
    ranked.push({ candidate, score });
  }

  ranked.sort((left, right) => right.score - left.score);

  const cap = Math.max(1, Math.round(limit));
  const artistCounts = new Map();
  const selected = [];
  const overflow = [];

  for (const row of ranked) {
    const artistKey = artistKeyOf(row.candidate);
    const used = artistCounts.get(artistKey) || 0;
    if (artistKey && used >= maxPerArtist) {
      overflow.push(row.candidate);
      continue;
    }
    selected.push(row.candidate);
    if (artistKey) artistCounts.set(artistKey, used + 1);
    if (selected.length >= cap) return selected.slice(0, cap);
  }

  for (const candidate of overflow) {
    if (selected.length >= cap) break;
    selected.push(candidate);
  }

  return selected.slice(0, cap);
};

export default buildSmartQueueFromSeed;
