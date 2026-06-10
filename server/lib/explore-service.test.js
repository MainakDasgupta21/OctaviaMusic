import { beforeEach, describe, expect, it, vi } from 'vitest';
import exploreService from './explore-service';

const {
  fetchExplorePulse,
  fetchExploreRadio,
  fetchExploreSimilar,
  fetchExploreJourney,
  __testing,
} = exploreService;

const mocks = {
  getTrendingLive: vi.fn(),
  searchSongs: vi.fn(),
  getSimilarTracks: vi.fn(),
  fetchRealChartData: vi.fn(),
  toTrackDTO: vi.fn(),
};

const makeRawTrack = (id, name, artist) => ({
  videoId: id,
  id,
  name,
  artist,
  artists: [{ name: artist }],
  thumbnail: `/img/${id}.jpg`,
});

describe('explore-service', () => {
  beforeEach(() => {
    __testing.clearCaches();
    __testing.setDeps({
      ytm: {
        getTrendingLive: mocks.getTrendingLive,
        searchSongs: mocks.searchSongs,
      },
      lastfm: {
        getSimilarTracks: mocks.getSimilarTracks,
      },
      fetchRealChartData: mocks.fetchRealChartData,
      toTrackDTO: mocks.toTrackDTO,
    });
    Object.values(mocks).forEach((fn) => fn.mockReset());
    mocks.toTrackDTO.mockImplementation((row) =>
      row
        ? {
            id: row.id || row.videoId,
            videoId: row.videoId || row.id,
            title: row.name || row.title,
            artist: row.artist || row.artists?.[0]?.name || 'Unknown',
            thumbnail: row.thumbnail || '/img/fallback.jpg',
          }
        : null,
    );
    mocks.getTrendingLive.mockResolvedValue([
      makeRawTrack('t1', 'Trending One', 'A'),
      makeRawTrack('t2', 'Trending Two', 'B'),
    ]);
    mocks.fetchRealChartData.mockResolvedValue({
      items: [makeRawTrack('c1', 'Chart One', 'C')],
    });
    mocks.searchSongs.mockResolvedValue([
      makeRawTrack('r1', 'Radio One', 'R'),
      makeRawTrack('r2', 'Radio Two', 'S'),
    ]);
    mocks.getSimilarTracks.mockResolvedValue([
      { name: 'Similar One', artist: 'Twin' },
    ]);
  });

  it('builds explore pulse payload with highlights', async () => {
    const payload = await fetchExplorePulse({ region: 'global' });
    expect(payload.highlights.length).toBeGreaterThan(0);
    expect(payload.chartWindows.today.length).toBeGreaterThanOrEqual(1);
    expect(payload.journeys.length).toBeGreaterThan(0);
  });

  it('keeps chart DTO titles/artists when deduping pulse rows', async () => {
    mocks.fetchRealChartData.mockResolvedValueOnce({
      items: [
        {
          id: 'dto-track-1',
          videoId: 'dto-track-1',
          title: 'DTO Song',
          artist: 'DTO Artist',
          thumbnail: '/img/dto.jpg',
        },
      ],
    }).mockResolvedValueOnce({
      items: [],
    });
    const payload = await fetchExplorePulse({ region: 'global' });
    const row = payload.chartWindows.today[0];
    expect(row?.title).toBe('DTO Song');
    expect(row?.artist).toBe('DTO Artist');
  });

  it('builds explore radio payload from mood/genre seed', async () => {
    const payload = await fetchExploreRadio({
      mood: 'focus',
      genre: 'ambient',
      seed: 'late night',
      limit: 8,
    });
    expect(payload.items.length).toBeGreaterThan(0);
    expect(payload.seed.mood).toBe('focus');
    expect(payload.seed.diversity).toBe('default');
    expect(payload.meta.diversity).toBe('default');
  });

  it('builds high-diversity radio using mixed buckets', async () => {
    let qIndex = 0;
    mocks.searchSongs.mockImplementation(async (query, limit = 6) =>
      Array.from({ length: Math.min(limit, 2) }).map((_, idx) =>
        makeRawTrack(`q${qIndex}-${idx}`, `${query} song ${idx + 1}`, `Artist ${idx + 1}`),
      ),
    );
    mocks.fetchRealChartData.mockResolvedValue({
      items: [
        makeRawTrack('classic-1', 'Classic One', 'Old Artist'),
        makeRawTrack('classic-2', 'Classic Two', 'Legacy'),
      ],
    });
    mocks.getTrendingLive.mockResolvedValue([
      makeRawTrack('trend-1', 'Trend One', 'Now'),
    ]);
    mocks.getSimilarTracks.mockImplementation(async (artist, track) => {
      qIndex += 1;
      return [{ name: `${track} remix`, artist: `${artist} Collective` }];
    });

    const payload = await fetchExploreRadio({
      mood: 'focus',
      genre: 'ambient',
      seed: 'night-123',
      diversity: 'high',
      limit: 12,
    });

    expect(payload.items.length).toBeGreaterThan(0);
    expect(payload.seed.diversity).toBe('high');
    expect(payload.meta.diversity).toBe('high');
    expect(payload.meta.buckets).toBeTruthy();
    expect(payload.meta.buckets.classics.available).toBeGreaterThan(0);
    expect(payload.meta.buckets.deepCuts.available).toBeGreaterThanOrEqual(0);
    expect(mocks.fetchRealChartData).toHaveBeenCalledWith(
      expect.objectContaining({ window: 'all_time' }),
    );
    expect(mocks.getSimilarTracks).toHaveBeenCalled();
    const searchQueries = mocks.searchSongs.mock.calls.map((call) => String(call?.[0] || ''));
    expect(searchQueries.some((query) => query.includes('old songs'))).toBe(true);
    expect(searchQueries.some((query) => query.includes('new songs'))).toBe(true);
  });

  it('supports strategy-based radio generation', async () => {
    const strategies = [
      'artist',
      'keyword',
      'alphabet',
      'trending',
      'fresh',
      'classic',
      'genre',
      'mood',
      'hidden',
      'personalized',
      'mixed',
    ];

    for (const strategy of strategies) {
      const payload = await fetchExploreRadio({
        mood: 'focus',
        genre: 'ambient',
        seed: 'night drive',
        strategy,
        seedArtists: ['Boards of Canada', 'Bonobo'],
        limit: 12,
      });

      expect(payload.items.length).toBeGreaterThan(0);
      expect(payload.seed.strategy).toBe(strategy);
      expect(payload.meta.strategy).toBe(strategy);
    }
  });

  it('falls back to default strategy for unknown values', async () => {
    const payload = await fetchExploreRadio({
      mood: 'focus',
      genre: 'ambient',
      seed: 'unknown-mode',
      strategy: 'not-real',
      limit: 8,
    });

    expect(payload.items.length).toBeGreaterThan(0);
    expect(payload.seed.strategy).toBe('default');
    expect(payload.meta.strategy).toBe('default');
  });

  it('returns empty similar payload for missing track id', async () => {
    const payload = await fetchExploreSimilar({ trackId: '', limit: 10 });
    expect(payload.items).toEqual([]);
  });

  it('builds journey queues from presets', async () => {
    const payload = await fetchExploreJourney({ journeyId: 'journey-night-drive' });
    expect(payload.id).toBe('journey-night-drive');
    expect(payload.items.length).toBeGreaterThan(0);
  });
});
