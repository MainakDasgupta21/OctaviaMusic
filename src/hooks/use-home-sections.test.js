import {
  buildDailyMixes,
  buildSectionOrdinals,
  buildTopArtists,
  pickHero,
} from '@/hooks/use-home-sections';

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
});
