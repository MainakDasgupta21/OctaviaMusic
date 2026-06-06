import {
  buildDailyMixes,
  buildSectionOrdinals,
  buildTopArtists,
  pickHero,
  pickSpotlightArtist,
} from '@/hooks/use-home-sections';

// Fixed reference instants — first one anchored well inside a single ISO week,
// the second one shifted +7d so they land in adjacent weekly buckets.
const WEEK_A = Date.UTC(2026, 5, 8, 12, 0, 0); // Mon 2026-06-08
const WEEK_B = WEEK_A + 7 * 86_400_000;

const makeChartTrack = (overrides) => ({
  id: overrides.id,
  videoId: overrides.id,
  artist: overrides.artist,
  artistSlug: overrides.artistSlug,
  thumbnail: `https://i.ytimg.com/vi/${overrides.id}/hqdefault.jpg`,
  plays: 0,
  rank: 1,
  prev: 1,
  ...overrides,
});

describe('use-home-sections helpers', () => {
  it('buildDailyMixes uses stable artist-derived ids', () => {
    const history = [
      { id: '1', videoId: 'JGwWNGJdvx8', artist: 'Daft Punk', thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg' },
      { id: '2', videoId: '2Vv-BfVoq4g', artist: 'Daft Punk', thumbnail: 'https://i.ytimg.com/vi/2Vv-BfVoq4g/hqdefault.jpg' },
      { id: '3', videoId: 'DkeiKbqa02g', artist: 'Dua Lipa', thumbnail: 'https://i.ytimg.com/vi/DkeiKbqa02g/hqdefault.jpg' },
    ];

    const mixes = buildDailyMixes({ history, favorites: [] });
    expect(mixes[0].id).toBe('mix-daft-punk');
    expect(mixes[1].id).toBe('mix-dua-lipa');
  });

  it('buildSectionOrdinals renumbers visible sections without gaps', () => {
    const ordinals = buildSectionOrdinals({
      hasHistory: false,
      hasTrending: true,
      hasDailyMixes: true,
      hasTopArtists: true,
    });

    expect(ordinals).toEqual({
      trending: 1,
      dailyMixes: 2,
      topArtists: 3,
    });
  });

  it('buildTopArtists keeps canonical slug only', () => {
    const history = [
      {
        id: 'h1',
        videoId: 'JGwWNGJdvx8',
        artist: 'Artist With Slug',
        artistSlug: 'artist-channel-id',
        thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg',
      },
      {
        id: 'h2',
        videoId: '2Vv-BfVoq4g',
        artist: 'Artist Missing Slug',
        thumbnail: 'https://i.ytimg.com/vi/2Vv-BfVoq4g/hqdefault.jpg',
      },
    ];

    const topArtists = buildTopArtists({ history });
    const withSlug = topArtists.find((row) => row.artist === 'Artist With Slug');
    const withoutSlug = topArtists.find((row) => row.artist === 'Artist Missing Slug');

    expect(withSlug?.slug).toBe('artist-channel-id');
    expect(withoutSlug?.slug).toBeNull();
  });

  it('pickHero rotates by day index', () => {
    const featured = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const sunday = new Date('2026-06-07T08:00:00.000Z'); // getDay() === 0
    const monday = new Date('2026-06-08T08:00:00.000Z'); // getDay() === 1

    expect(pickHero(featured, sunday).id).toBe('a');
    expect(pickHero(featured, monday).id).toBe('b');
  });

  it('pickSpotlightArtist returns null when no charts or trending rows are supplied', () => {
    expect(pickSpotlightArtist({})).toBeNull();
    expect(pickSpotlightArtist({ charts: [], trending: [] })).toBeNull();
  });

  it('pickSpotlightArtist is deterministic within the same week', () => {
    const charts = [
      makeChartTrack({ id: 'a1', artist: 'Aurora', artistSlug: 'aurora-id', rank: 1, plays: 5_000_000 }),
      makeChartTrack({ id: 'b1', artist: 'Beck', artistSlug: 'beck-id', rank: 2, plays: 4_000_000 }),
      makeChartTrack({ id: 'c1', artist: 'Cleo', artistSlug: 'cleo-id', rank: 3, plays: 3_000_000 }),
    ];
    const trending = [
      makeChartTrack({ id: 'd1', artist: 'Doja', artistSlug: 'doja-id', plays: 9_000_000 }),
    ];

    const first = pickSpotlightArtist({ charts, trending, now: WEEK_A });
    const second = pickSpotlightArtist({ charts, trending, now: WEEK_A + 6 * 3600_000 });
    expect(first).not.toBeNull();
    expect(second?.slug).toBe(first?.slug);
    expect(second?.weekIndex).toBe(first?.weekIndex);
  });

  it('pickSpotlightArtist rotates the pick across weeks for a varied pool', () => {
    // 50 synthetic artists with descending popularity so the weighted draw
    // has real variance to sample from.
    const charts = Array.from({ length: 50 }, (_, i) =>
      makeChartTrack({
        id: `chart-${i}`,
        artist: `Artist ${i}`,
        artistSlug: `artist-${i}-id`,
        rank: i + 1,
        plays: Math.max(1_000_000, 10_000_000 - i * 150_000),
      }),
    );
    const trending = Array.from({ length: 20 }, (_, i) =>
      makeChartTrack({
        id: `trend-${i}`,
        artist: `Artist ${i + 5}`,
        artistSlug: `artist-${i + 5}-id`,
        plays: Math.max(500_000, 5_000_000 - i * 100_000),
      }),
    );

    const picks = new Set();
    for (let w = 0; w < 12; w += 1) {
      const pick = pickSpotlightArtist({
        charts,
        trending,
        now: WEEK_A + w * 7 * 86_400_000,
      });
      if (pick) picks.add(pick.slug);
    }
    // Sanity check, not a correctness proof: across 12 weekly seeds the
    // weighted draw should land on more than one artist.
    expect(picks.size).toBeGreaterThan(1);
  });

  it('pickSpotlightArtist surfaces scoring breakdown alongside legacy fields', () => {
    const charts = [
      makeChartTrack({ id: 'a1', artist: 'Aurora', artistSlug: 'aurora-id', rank: 1, prev: 5, plays: 2_000_000 }),
    ];
    const trending = [
      makeChartTrack({ id: 'a2', artist: 'Aurora', artistSlug: 'aurora-id', plays: 1_000_000 }),
    ];
    const pick = pickSpotlightArtist({ charts, trending, now: WEEK_B });
    expect(pick).toMatchObject({
      slug: 'aurora-id',
      artist: 'Aurora',
      chartTracks: 1,
      trendingTracks: 1,
      momentum: 4,
    });
    expect(pick.score).toBeGreaterThan(0);
    expect(typeof pick.weekIndex).toBe('number');
  });
});
