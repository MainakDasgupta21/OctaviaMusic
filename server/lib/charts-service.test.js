import { beforeEach, describe, expect, it } from 'vitest';
import chartsService from './charts-service';

const { fetchRealChartData, getWindowTtlMs, __testing } = chartsService;

const makePayload = ({
  source = 'lastfm+musicbrainz+ytm',
  warning = null,
} = {}) => ({
  items: [
    {
      id: 'yt_test_track',
      rank: 1,
      title: 'Test Song',
      artist: 'Test Artist',
    },
  ],
  lastUpdated: '2026-06-01T12:00:00.000Z',
  meta: {
    source,
    mode: 'songs',
    region: 'global',
    window: 'this_week',
    fetchedAt: '2026-06-01T12:00:00.000Z',
    stale: false,
    warning,
  },
});

describe('charts-service cache behaviour', () => {
  beforeEach(() => {
    __testing.clearCaches();
  });

  it('serves fresh cache entries without stale marker', async () => {
    __testing.seedChartCache({
      mode: 'songs',
      region: 'global',
      window: 'this_week',
      limit: 50,
      fetchedAt: Date.now(),
      payload: makePayload(),
    });

    const result = await fetchRealChartData({
      mode: 'songs',
      region: 'global',
      window: 'this_week',
      limit: 50,
    });

    expect(result.meta.stale).toBe(false);
    expect(result.meta.warning).toBeNull();
    expect(result.items).toHaveLength(1);
  });

  it('returns stale cache immediately when entry is expired', async () => {
    const ttl = getWindowTtlMs('this_week');
    __testing.seedChartCache({
      mode: 'songs',
      region: 'global',
      window: 'this_week',
      limit: 50,
      fetchedAt: Date.now() - ttl - 5000,
      payload: makePayload(),
    });

    const result = await fetchRealChartData({
      mode: 'songs',
      region: 'global',
      window: 'weekly',
      limit: 50,
      backgroundRefresh: false,
    });

    expect(result.meta.stale).toBe(true);
    expect(result.meta.warning).toContain('Showing cached data from');
    expect(result.items).toHaveLength(1);
  });
});
