import { sanitizeImageUrl, sanitizeTrack } from '@/lib/media-sanitize';

// =============================================================================
// Spotlight Artist — weighted, weekly pick
// -----------------------------------------------------------------------------
// The Home page wants one "Featured artist this week" that:
//   - Reflects current performance (popularity + hype + views + momentum).
//   - Rotates weekly without admin work.
//   - Stays stable within a week (a returning visitor on Friday sees the
//     same artist as on Monday).
//   - Can surface old names AND brand-new ones — old hits stay weighted by
//     their chart presence, new ones lean on `trendingTracks` + momentum.
//
// The math: build a composite score per artist, take the top N candidates,
// then run a weighted random sample seeded by the current ISO week. A given
// (charts, trending, week) tuple always picks the same artist, so the result
// is fully deterministic and easy to unit-test.
// =============================================================================

const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_WEEK = 7 * SECONDS_PER_DAY;
const DEFAULT_TOP_N = 20;
const WEIGHT_EXPONENT = 0.7; // <1 softens the bias toward top performers.

const artistKey = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

// Anchor weeks to Monday 00:00 UTC. Unix epoch 1970-01-01 was a Thursday, so
// shifting by 4 days lands the bucket boundary on Monday. Off-by-one across
// timezones is fine — what matters is everyone in the same calendar week
// gets the same pick.
export const weeklySeed = (now = Date.now()) =>
  Math.floor((now / 1000 + 4 * SECONDS_PER_DAY) / SECONDS_PER_WEEK);

// Deterministic 32-bit PRNG. Tiny, zero-dependency, plenty of entropy for
// picking 1-of-20.
// https://stackoverflow.com/a/47593316
export const mulberry32 = (seed) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4_294_967_296;
  };
};

// Sample one element with weight = weightFn(item). Falls back to the first
// item when total weight collapses to zero (shouldn't happen with our floor).
export const weightedPick = (candidates, weightFn, rng) => {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const weights = candidates.map((c) => Math.max(0, weightFn(c)));
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return candidates[0];
  let r = rng() * total;
  for (let i = 0; i < candidates.length; i += 1) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
};

// Per-artist composite score combining popularity (chart presence + views +
// peak rank) and hype (trending presence + positive rank momentum).
const scoreCandidate = (entry) => {
  const popularity =
    entry.chartTracks * 3
    + Math.log10(entry.totalPlays + 1) * 1.5
    + (entry.chartTracks > 0
      ? (100 - clamp(entry.bestRank, 1, 100)) / 25
      : 0);
  const hype = entry.trendingTracks * 4 + Math.max(0, entry.momentum) * 0.5;
  return popularity + hype + 0.5; // floor so one-off appearances still qualify
};

// Build the ranked pool of candidates from raw chart + trending rows. Each
// returned candidate has every signal exposed so callers (or tests) can
// inspect why someone made the cut.
export const scoreArtistsFromFeed = (charts = [], trending = []) => {
  const byArtist = new Map();

  const upsert = (track, source) => {
    if (!track?.artist || !track.artistSlug) return;
    const key = artistKey(track.artist);
    if (!key) return;

    const entry = byArtist.get(key) || {
      key,
      artist: track.artist,
      slug: track.artistSlug,
      sample: null,
      chartTracks: 0,
      trendingTracks: 0,
      totalPlays: 0,
      bestRank: Infinity,
      momentum: 0,
      count: 0,
    };

    entry.sample = entry.sample || sanitizeImageUrl(track.thumbnail);
    entry.count += 1;

    if (source === 'charts') {
      entry.chartTracks += 1;
      if (Number.isFinite(track.plays)) entry.totalPlays += track.plays;
      if (Number.isFinite(track.rank) && track.rank < entry.bestRank) {
        entry.bestRank = track.rank;
      }
      if (Number.isFinite(track.rank) && Number.isFinite(track.prev)) {
        entry.momentum += track.prev - track.rank;
      }
    } else {
      entry.trendingTracks += 1;
      if (Number.isFinite(track.plays)) entry.totalPlays += track.plays;
    }

    byArtist.set(key, entry);
  };

  for (const row of charts) upsert(sanitizeTrack(row), 'charts');
  for (const row of trending) upsert(sanitizeTrack(row), 'trending');

  return Array.from(byArtist.values())
    .map((entry) => ({ ...entry, score: scoreCandidate(entry) }))
    .sort((a, b) => b.score - a.score);
};

// Convenience composition that the use-home-sections hook calls. Returns
// `null` when no candidate qualifies; otherwise returns an entry whose
// shape is a superset of the legacy {key, artist, slug, sample, count}
// payload, so HomePage's existing consumer keeps working.
export const pickWeeklySpotlight = ({
  charts = [],
  trending = [],
  now,
  topN = DEFAULT_TOP_N,
} = {}) => {
  const ranked = scoreArtistsFromFeed(charts, trending);
  if (ranked.length === 0) return null;

  // Quality floor: the weighted draw only considers the strongest performers,
  // not the long tail. Prevents an obscure single-track artist from winning
  // by random chance.
  const pool = ranked.slice(0, topN);

  const seed = weeklySeed(now);
  const rng = mulberry32(seed);
  const picked = weightedPick(
    pool,
    (entry) => entry.score ** WEIGHT_EXPONENT,
    rng,
  );

  return picked ? { ...picked, weekIndex: seed } : null;
};
