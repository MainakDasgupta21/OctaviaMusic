import { describe, expect, it } from 'vitest';
import { queryKeys } from '@/lib/query-keys';

describe('queryKeys.charts', () => {
  it('normalizes legacy chart window aliases', () => {
    expect(queryKeys.charts('global', 'weekly', 50)).toEqual(
      queryKeys.charts('global', 'this_week', 50),
    );
    expect(queryKeys.charts('global', 'daily', 50)).toEqual(
      queryKeys.charts('global', 'today', 50),
    );
    expect(queryKeys.charts('global', 'monthly', 50)).toEqual(
      queryKeys.charts('global', 'this_month', 50),
    );
  });

  it('normalizes region aliases and invalid values', () => {
    expect(queryKeys.charts('jp', 'this_week', 50)).toEqual(
      queryKeys.charts('japan', 'this_week', 50),
    );
    expect(queryKeys.charts('unknown-region', 'this_week', 50)).toEqual(
      queryKeys.charts('global', 'this_week', 50),
    );
  });

  it('normalizes limit values to stable integers', () => {
    expect(queryKeys.charts('global', 'this_week', 49.8)).toEqual(
      queryKeys.charts('global', 'this_week', 50),
    );
    expect(queryKeys.charts('global', 'this_week', undefined)).toEqual(
      queryKeys.charts('global', 'this_week', 50),
    );
  });

  it('keeps songs and artists key spaces distinct', () => {
    expect(queryKeys.charts('global', 'this_week', 50)).not.toEqual(
      queryKeys.chartsArtists('global', 'this_week', 50),
    );
  });
});

describe('queryKeys.exploreRadio', () => {
  it('scopes cache keys by strategy and seed artists', () => {
    const base = queryKeys.exploreRadio({
      mood: 'focus',
      genre: 'ambient',
      seed: 'night',
      limit: 24,
      strategy: 'artist',
      seedArtists: 'Bonobo,Tycho',
    });
    const sameNormalized = queryKeys.exploreRadio({
      mood: ' Focus ',
      genre: 'Ambient',
      seed: 'Night',
      limit: 24.4,
      strategy: 'ARTIST',
      seedArtists: ['bonobo', 'tycho'],
    });
    const differentStrategy = queryKeys.exploreRadio({
      mood: 'focus',
      genre: 'ambient',
      seed: 'night',
      limit: 24,
      strategy: 'keyword',
      seedArtists: 'Bonobo,Tycho',
    });

    expect(base).toEqual(sameNormalized);
    expect(base).not.toEqual(differentStrategy);
  });
});
