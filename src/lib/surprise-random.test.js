import { beforeEach, describe, expect, it } from 'vitest';
import {
  SURPRISE_SEEN_MAX,
  addSurpriseSeenTrack,
  buildSurpriseSeed,
  filterUnseenSurpriseTracks,
  getSurpriseSeenSet,
  readSurpriseSeenIds,
  surpriseTrackId,
} from '@/lib/surprise-random';

describe('surprise-random', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it('normalizes surprise ids with videoId fallback', () => {
    expect(surpriseTrackId({ id: 'track-1', videoId: 'video-a' })).toBe('track-1');
    expect(surpriseTrackId({ videoId: 'video-a' })).toBe('video-a');
    expect(surpriseTrackId({})).toBeNull();
  });

  it('stores unique surprise ids in session order', () => {
    addSurpriseSeenTrack({ id: 'track-1' });
    addSurpriseSeenTrack({ videoId: 'video-2' });
    addSurpriseSeenTrack({ id: 'track-1' });

    expect(readSurpriseSeenIds()).toEqual(['track-1', 'video-2']);
  });

  it('filters unseen surprise tracks from candidates', () => {
    addSurpriseSeenTrack({ id: 'seen-1' });
    const unseen = filterUnseenSurpriseTracks([
      { id: 'seen-1' },
      { id: 'fresh-1' },
      { videoId: 'fresh-video' },
    ], { seenSet: getSurpriseSeenSet() });

    expect(unseen.map((track) => surpriseTrackId(track))).toEqual(['fresh-1', 'fresh-video']);
  });

  it('builds non-empty random seeds', () => {
    const seed = buildSurpriseSeed();
    expect(typeof seed).toBe('string');
    expect(seed.length).toBeGreaterThan(5);
    expect(seed).toMatch(/-/);
  });

  it('keeps seen-id list bounded for long sessions', () => {
    for (let i = 0; i < SURPRISE_SEEN_MAX + 20; i += 1) {
      addSurpriseSeenTrack({ id: `track-${i}` });
    }
    const ids = readSurpriseSeenIds();
    expect(ids.length).toBe(SURPRISE_SEEN_MAX);
    expect(ids[0]).toBe(`track-${SURPRISE_SEEN_MAX + 19}`);
  });
});
