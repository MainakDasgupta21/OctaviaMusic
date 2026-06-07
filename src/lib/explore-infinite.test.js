import { describe, expect, it } from 'vitest';
import {
  buildInfiniteBatch,
  mergeInfiniteSources,
  normalizeFlowSeed,
} from '@/lib/explore-infinite';

const track = (id, artist) => ({
  id,
  videoId: id,
  title: `Track ${id}`,
  artist,
});

describe('explore-infinite', () => {
  it('normalizes seed values safely', () => {
    const seed = normalizeFlowSeed({ mood: ' Focus ', genre: ' Indie ', seed: ' 123 ' });
    expect(seed).toEqual({ mood: 'focus', genre: 'indie', seed: '123' });
  });

  it('merges sources with stable dedupe ordering', () => {
    const out = mergeInfiniteSources({
      radioItems: [track('a', 'One'), track('b', 'Two')],
      localPool: [track('b', 'Two'), track('c', 'Three')],
      similarItems: [track('a', 'One'), track('d', 'Four')],
    });
    expect(out.map((row) => row.id)).toEqual(['a', 'b', 'd', 'c']);
  });

  it('builds diverse batches and tracks cursor', () => {
    const pool = [
      track('a', 'Artist A'),
      track('b', 'Artist A'),
      track('c', 'Artist A'),
      track('d', 'Artist B'),
      track('e', 'Artist C'),
      track('f', 'Artist D'),
    ];

    const batch = buildInfiniteBatch({
      pool,
      size: 4,
      cursor: 0,
      consumedIds: new Set(['a']),
      maxPerArtist: 1,
    });
    expect(batch.items).toHaveLength(4);
    expect(batch.items.some((row) => row.id === 'a')).toBe(false);
    expect(batch.nextCursor).toBeGreaterThanOrEqual(0);
  });
});
