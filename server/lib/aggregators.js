// Derived rankings built from the existing chart payload. We don't have a
// dedicated upstream "top artists" feed, so we fold the per-track chart into an
// artist-level ranking using three signals (in priority order):
//
//   1. Number of distinct tracks an artist has on the chart  (most signal)
//   2. Total chart-credited plays                            (tiebreaker)
//   3. Best (lowest) track rank achieved by the artist       (final tiebreaker)
//
// Keeping the aggregator pure makes it easy to unit-test and to run against
// either the live YTM chart rows or the curated fallback catalog.

// Same slug rule mappers.js + src/lib/slug.js use. Re-implemented locally so
// this module stays self-contained.
const slugifyName = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const aggregateTopArtists = (tracks, { limit = 50 } = {}) => {
  const map = new Map();
  for (const t of tracks || []) {
    const key = t.artistSlug || t.artistId;
    if (!key || !t.artist) continue;
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        type: 'artist',
        slug: key,
        humanSlug: t.artistHumanSlug || slugifyName(t.artist),
        name: t.artist,
        // First track's artwork stands in for a portrait — YTM track thumbnails
        // are usually the artist's official cover for chart-grade hits.
        thumbnail: t.thumbnail || null,
        tracks: 0,
        plays: 0,
        bestRank: Number.isFinite(t.rank) ? t.rank : Infinity,
      });
    }
    const entry = map.get(key);
    entry.tracks += 1;
    if (Number.isFinite(t.plays)) entry.plays += t.plays;
    if (Number.isFinite(t.rank) && t.rank < entry.bestRank) entry.bestRank = t.rank;
    // Prefer the artwork from the artist's highest-ranked chart entry.
    if (Number.isFinite(t.rank) && t.rank === entry.bestRank && t.thumbnail) {
      entry.thumbnail = t.thumbnail;
    }
  }
  return [...map.values()]
    .sort((a, b) =>
      b.tracks - a.tracks
      || b.plays - a.plays
      || a.bestRank - b.bestRank,
    )
    .slice(0, limit)
    .map((a, i) => ({ ...a, rank: i + 1 }));
};

module.exports = { aggregateTopArtists };
