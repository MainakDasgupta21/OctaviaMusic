import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __testing,
  DAY_MS,
  DISCOVERY_MEMORY_KEY,
  DISCOVERY_TRACK_MAX,
  getArtistFatigueMap,
  getSeenTrackSet,
  loadMemory,
  markStrategyUsed,
  markTrackSeen,
  resetMemory,
} from '@/lib/discovery-memory';

describe('discovery-memory', () => {
  beforeEach(() => {
    resetMemory();
    __testing.clearRuntimeCache();
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DISCOVERY_MEMORY_KEY);
    }
  });

  it('writes and reads recommendation history', () => {
    markTrackSeen({ id: 'track-a', artist: 'Artist A' }, 'mood');
    markTrackSeen({ id: 'track-b', artist: 'Artist B' }, 'genre');
    markStrategyUsed('keyword');

    const memory = loadMemory();
    expect(Object.keys(memory.tracks)).toEqual(expect.arrayContaining(['track-a', 'track-b']));
    expect(memory.tracks['track-a']?.source).toBe('mood');
    expect(memory.strategies[0]?.name).toBe('keyword');

    const seen = getSeenTrackSet();
    expect(seen.has('track-a')).toBe(true);
    expect(seen.has('track-b')).toBe(true);

    const fatigue = getArtistFatigueMap();
    expect(fatigue.get('artist a')).toBeGreaterThan(0);
  });

  it('evicts least-recent tracks over the LRU cap', () => {
    const baseTs = Date.now() - (2 * DAY_MS);
    const tracks = {};
    for (let index = 0; index <= DISCOVERY_TRACK_MAX; index += 1) {
      tracks[`track-${index}`] = {
        ts: baseTs + index,
        count: 1,
        source: 'seed',
      };
    }
    window.localStorage.setItem(
      DISCOVERY_MEMORY_KEY,
      JSON.stringify({
        tracks,
        artists: {},
        strategies: [],
        updatedAt: baseTs,
      }),
    );
    __testing.clearRuntimeCache();

    const memory = loadMemory();
    expect(Object.keys(memory.tracks)).toHaveLength(DISCOVERY_TRACK_MAX);
    expect(memory.tracks['track-0']).toBeUndefined();
    expect(memory.tracks[`track-${DISCOVERY_TRACK_MAX}`]).toBeTruthy();
  });

  it('drops stale memory entries older than 30 days', () => {
    const staleTs = Date.now() - (31 * DAY_MS);
    window.localStorage.setItem(
      DISCOVERY_MEMORY_KEY,
      JSON.stringify({
        tracks: {
          staleTrack: { ts: staleTs, count: 2, source: 'old' },
        },
        artists: {
          staleartist: { ts: staleTs, count: 4 },
        },
        strategies: [{ name: 'artist', ts: staleTs }],
        updatedAt: staleTs,
      }),
    );

    __testing.clearRuntimeCache();
    const memory = loadMemory();

    expect(memory.tracks).toEqual({});
    expect(memory.artists).toEqual({});
    expect(memory.strategies).toEqual([]);
  });

  it('degrades gracefully when storage read fails', () => {
    const getItemSpy = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('storage blocked');
      });

    __testing.clearRuntimeCache();
    const memory = loadMemory();
    const seen = getSeenTrackSet();

    expect(memory.tracks).toEqual({});
    expect(memory.artists).toEqual({});
    expect(seen.size).toBe(0);

    getItemSpy.mockRestore();
  });
});
