import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRankedSearch, __testing } from '@/hooks/use-ranked-search';

const { fingerprint, candidateCountOf, WORKER_THRESHOLD } = __testing;

const buildPayload = (size = 0) => ({
  query: 'blinding lights',
  serverResults: Array.from({ length: size }, (_, i) => ({
    type: 'song',
    kind: 'song',
    id: `id${i}aaaaa`,
    videoId: `id${i}aaaaa`,
    title: 'Blinding Lights',
    artist: 'The Weeknd',
  })),
  favorites: [],
  history: [],
  playlists: [],
});

describe('candidateCountOf', () => {
  it('sums every input collection', () => {
    expect(
      candidateCountOf({
        serverResults: [1, 2],
        favorites: [3],
        history: [4, 5, 6],
        playlists: [],
      }),
    ).toBe(6);
  });

  it('handles missing fields safely', () => {
    expect(candidateCountOf({})).toBe(0);
    expect(candidateCountOf(undefined)).toBe(0);
  });
});

describe('fingerprint', () => {
  it('captures the query string + collection sizes', () => {
    const fp = fingerprint(buildPayload(3));
    const parsed = JSON.parse(fp);
    expect(parsed.q).toBe('blinding lights');
    expect(parsed.s).toBe(3);
  });

  it('changes when the query changes', () => {
    expect(fingerprint(buildPayload(0))).not.toBe(
      fingerprint({ ...buildPayload(0), query: 'starboy' }),
    );
  });
});

describe('useRankedSearch — sync fallback', () => {
  // jsdom doesn't expose `Worker`, so the hook always returns the sync result.
  it('returns rankAndMerge output for small payloads', () => {
    const { result } = renderHook(() => useRankedSearch(buildPayload(2)));
    // Match keys we expect from rankAndMerge
    expect(result.current).toBeTruthy();
    expect(Array.isArray(result.current.songs)).toBe(true);
    expect(result.current.top).toBeTruthy();
  });

  it('returns rankAndMerge output even when the candidate count crosses the worker threshold', () => {
    // Without a Worker available, the hook silently uses the sync ranker.
    const { result } = renderHook(() =>
      useRankedSearch(buildPayload(WORKER_THRESHOLD + 5)),
    );
    expect(Array.isArray(result.current.songs)).toBe(true);
    expect(result.current.songs.length).toBeGreaterThan(0);
  });
});
