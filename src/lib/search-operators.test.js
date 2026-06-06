import { describe, it, expect } from 'vitest';
import {
  durationMax,
  setAlbumFilter,
  setArtistFilter,
  setDurationMax,
  setNegativeToken,
  setSort,
  setYearRange,
  stripAlbumFilter,
  stripArtistFilter,
  stripDurationFilters,
  stripSortFilter,
  stripYearFilters,
  toggleKeyword,
  yearBounds,
} from '@/lib/search-operators';

describe('setYearRange', () => {
  it('writes both bounds when supplied', () => {
    expect(setYearRange('rock', 2000, 2010)).toBe('rock year>=2000 year<=2010');
  });

  it('omits bounds that are null', () => {
    expect(setYearRange('rock', 2000, null)).toBe('rock year>=2000');
    expect(setYearRange('rock', null, 2010)).toBe('rock year<=2010');
  });

  it('replaces existing year operators', () => {
    expect(setYearRange('rock year>=1990 year<=2000', 2000, 2020)).toBe(
      'rock year>=2000 year<=2020',
    );
  });
});

describe('setDurationMax', () => {
  it('appends the operator', () => {
    expect(setDurationMax('jam', 180)).toBe('jam duration<=180');
  });

  it('replaces an existing duration operator', () => {
    expect(setDurationMax('jam duration<=300', 180)).toBe('jam duration<=180');
  });

  it('strips when no max is provided', () => {
    expect(setDurationMax('jam duration<=300', null)).toBe('jam');
  });
});

describe('setSort', () => {
  it('replaces an existing sort hint', () => {
    expect(setSort('hits sort:popular', 'newest')).toBe('hits sort:newest');
  });

  it('strips when relevance is selected', () => {
    expect(setSort('hits sort:popular', 'relevance')).toBe('hits');
  });
});

describe('toggleKeyword', () => {
  it('adds the keyword when toggled on', () => {
    expect(toggleKeyword('hits', 'live', true)).toBe('hits live');
  });

  it('removes the keyword when toggled off', () => {
    expect(toggleKeyword('hits live', 'live', false)).toBe('hits');
  });

  it('is idempotent — multiple offs leave the query alone', () => {
    expect(toggleKeyword('hits', 'live', false)).toBe('hits');
  });
});

describe('yearBounds', () => {
  it('extracts >= as `from` and <= as `to`', () => {
    const bounds = yearBounds([
      { op: '>=', value: 2000 },
      { op: '<=', value: 2010 },
    ]);
    expect(bounds).toEqual({ from: 2000, to: 2010 });
  });

  it('handles strict comparators', () => {
    const bounds = yearBounds([
      { op: '>', value: 1999 },
      { op: '<', value: 2011 },
    ]);
    expect(bounds).toEqual({ from: 2000, to: 2010 });
  });

  it('returns nulls for an empty list', () => {
    expect(yearBounds([])).toEqual({ from: null, to: null });
    expect(yearBounds(null)).toEqual({ from: null, to: null });
  });
});

describe('durationMax', () => {
  it('returns the most restrictive cap from a list of operators', () => {
    expect(
      durationMax([
        { op: '<=', value: 300 },
        { op: '<=', value: 180 },
      ]),
    ).toBe(180);
  });

  it('returns null when no max is present', () => {
    expect(durationMax([])).toBeNull();
    expect(durationMax(null)).toBeNull();
  });
});

describe('strip helpers', () => {
  it('stripYearFilters removes every year operator', () => {
    expect(stripYearFilters('rock year>=2000 year<=2010 hits')).toBe('rock hits');
  });
  it('stripDurationFilters removes every duration operator', () => {
    expect(stripDurationFilters('jam duration<=120 duration>=30')).toBe('jam');
  });
  it('stripSortFilter removes the sort hint', () => {
    expect(stripSortFilter('hits sort:newest')).toBe('hits');
  });
  it('stripArtistFilter removes quoted and bare artist operators', () => {
    expect(stripArtistFilter('hits artist:"Taylor Swift" love')).toBe('hits love');
    expect(stripArtistFilter('hits artist:drake love')).toBe('hits love');
  });
  it('stripAlbumFilter removes quoted and bare album operators', () => {
    expect(stripAlbumFilter('hits album:"Folklore" love')).toBe('hits love');
    expect(stripAlbumFilter('hits album:scorpion love')).toBe('hits love');
  });
});

describe('setArtistFilter', () => {
  it('quotes multi-word names', () => {
    expect(setArtistFilter('rock', 'Taylor Swift')).toBe('rock artist:"Taylor Swift"');
  });
  it('leaves single-token names unquoted', () => {
    expect(setArtistFilter('rock', 'drake')).toBe('rock artist:drake');
  });
  it('replaces an existing artist operator', () => {
    expect(setArtistFilter('rock artist:drake', 'Frank Ocean')).toBe(
      'rock artist:"Frank Ocean"',
    );
  });
  it('strips when an empty value is supplied', () => {
    expect(setArtistFilter('rock artist:drake', '')).toBe('rock');
    expect(setArtistFilter('rock artist:drake', '   ')).toBe('rock');
  });
});

describe('setAlbumFilter', () => {
  it('quotes multi-word titles', () => {
    expect(setAlbumFilter('hits', 'The Eras Tour')).toBe('hits album:"The Eras Tour"');
  });
  it('replaces an existing album operator', () => {
    expect(setAlbumFilter('hits album:folklore', 'Lover')).toBe('hits album:Lover');
  });
  it('strips when an empty value is supplied', () => {
    expect(setAlbumFilter('hits album:folklore', null)).toBe('hits');
  });
});

describe('setNegativeToken', () => {
  it('adds a leading dash to exclude a token', () => {
    expect(setNegativeToken('hits', 'live', true)).toBe('hits -live');
  });
  it('flips an existing positive token into a negative', () => {
    expect(setNegativeToken('hits live', 'live', true)).toBe('hits -live');
  });
  it('removes the negative token when toggled off', () => {
    expect(setNegativeToken('hits -live', 'live', false)).toBe('hits');
  });
  it('is idempotent when toggling off a missing token', () => {
    expect(setNegativeToken('hits', 'live', false)).toBe('hits');
  });
});
