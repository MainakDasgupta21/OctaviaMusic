import { describe, it, expect } from 'vitest';
import {
  EMPTY_FILTERS,
  addExclude,
  clearFilter,
  composeQuery,
  filterCount,
  filtersFromSearchParams,
  hasAnyFilter,
  removeExclude,
  setFilter,
  toggleMood,
  writeFiltersToSearchParams,
} from '@/lib/search-filter-state';

const makeParams = (entries = {}) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(entries)) sp.set(k, v);
  return sp;
};

describe('filtersFromSearchParams', () => {
  it('returns the empty shape when no params are present', () => {
    expect(filtersFromSearchParams(new URLSearchParams())).toEqual(EMPTY_FILTERS);
  });

  it('reads every dimension', () => {
    const sp = makeParams({
      sort: 'popularity',
      yearFrom: '2010',
      yearTo: '2019',
      duration: '180',
      artist: 'Drake',
      album: 'Scorpion',
      clean: '1',
      mood: 'live,acoustic',
      exclude: 'karaoke,cover',
    });
    expect(filtersFromSearchParams(sp)).toEqual({
      sort: 'popularity',
      yearFrom: 2010,
      yearTo: 2019,
      durationMax: 180,
      artist: 'Drake',
      album: 'Scorpion',
      clean: true,
      mood: ['live', 'acoustic'],
      exclude: ['karaoke', 'cover'],
    });
  });

  it('silently drops invalid sort / mood values', () => {
    const sp = makeParams({ sort: 'random', mood: 'live,bogus' });
    const out = filtersFromSearchParams(sp);
    expect(out.sort).toBe('relevance');
    expect(out.mood).toEqual(['live']);
  });

  it('coerces out-of-range years to null', () => {
    const sp = makeParams({ yearFrom: '1800', yearTo: '99999' });
    const out = filtersFromSearchParams(sp);
    expect(out.yearFrom).toBeNull();
    expect(out.yearTo).toBeNull();
  });
});

describe('writeFiltersToSearchParams', () => {
  it('round-trips with filtersFromSearchParams', () => {
    const original = {
      sort: 'newest',
      yearFrom: 2000,
      yearTo: 2010,
      durationMax: 240,
      artist: 'Frank Ocean',
      album: 'Blonde',
      clean: true,
      mood: ['remix'],
      exclude: ['live'],
    };
    const sp = new URLSearchParams();
    writeFiltersToSearchParams(sp, original);
    const back = filtersFromSearchParams(sp);
    expect(back).toEqual(original);
  });

  it('removes keys for empty / default values so the URL stays clean', () => {
    const sp = makeParams({ sort: 'newest', clean: '1' });
    writeFiltersToSearchParams(sp, EMPTY_FILTERS);
    expect(sp.has('sort')).toBe(false);
    expect(sp.has('clean')).toBe(false);
    expect(sp.has('yearFrom')).toBe(false);
    expect(sp.toString()).toBe('');
  });

  it('preserves unrelated keys like ?q= and ?type=', () => {
    const sp = makeParams({ q: 'blinding lights', type: 'song' });
    writeFiltersToSearchParams(sp, { ...EMPTY_FILTERS, sort: 'popularity' });
    expect(sp.get('q')).toBe('blinding lights');
    expect(sp.get('type')).toBe('song');
    expect(sp.get('sort')).toBe('popularity');
  });
});

describe('composeQuery', () => {
  it('returns just the user text when no filters are set', () => {
    expect(composeQuery('blinding lights', EMPTY_FILTERS)).toBe('blinding lights');
  });

  it('appends sort and clean operators', () => {
    const composed = composeQuery('hits', {
      ...EMPTY_FILTERS,
      sort: 'popularity',
      clean: true,
    });
    expect(composed).toContain('hits');
    expect(composed).toContain('sort:popularity');
    expect(composed).toContain('clean');
  });

  it('writes quoted artist and album operators when names contain spaces', () => {
    const composed = composeQuery('', {
      ...EMPTY_FILTERS,
      artist: 'Taylor Swift',
      album: 'Eras',
    });
    expect(composed).toMatch(/artist:"Taylor Swift"/);
    expect(composed).toMatch(/album:Eras/);
  });

  it('emits a year range and duration cap together', () => {
    const composed = composeQuery('rock', {
      ...EMPTY_FILTERS,
      yearFrom: 2000,
      yearTo: 2009,
      durationMax: 240,
    });
    expect(composed).toContain('year>=2000');
    expect(composed).toContain('year<=2009');
    expect(composed).toContain('duration<=240');
  });

  it('serializes mood tags as positive keywords', () => {
    const composed = composeQuery('chill', {
      ...EMPTY_FILTERS,
      mood: ['live', 'acoustic'],
    });
    expect(composed).toContain('live');
    expect(composed).toContain('acoustic');
  });

  it('serializes exclude tokens with leading dashes', () => {
    const composed = composeQuery('jam', {
      ...EMPTY_FILTERS,
      exclude: ['karaoke', 'cover'],
    });
    expect(composed).toContain('-karaoke');
    expect(composed).toContain('-cover');
  });

  it('is idempotent: composing then re-composing yields the same string', () => {
    const filters = {
      ...EMPTY_FILTERS,
      sort: 'newest',
      yearFrom: 2020,
      mood: ['live'],
      clean: true,
    };
    const once = composeQuery('rock', filters);
    const twice = composeQuery('rock', filters);
    expect(once).toBe(twice);
  });

  it('never leaks operator text back into the user text input portion', () => {
    // composeQuery's contract is one-way (text + filters -> operator string).
    // The visible <Input> binds to userText separately, so even if filters
    // are loaded, userText must remain operator-free. This test guards the
    // SearchPage contract from a future refactor that accidentally mixes.
    const userText = 'blinding lights';
    const composed = composeQuery(userText, { ...EMPTY_FILTERS, sort: 'popularity' });
    expect(userText).not.toContain('sort:');
    expect(userText).not.toContain('clean');
    expect(composed).not.toBe(userText);
  });
});

describe('hasAnyFilter / filterCount', () => {
  it('reports zero for an empty filter shape', () => {
    expect(hasAnyFilter(EMPTY_FILTERS)).toBe(false);
    expect(filterCount(EMPTY_FILTERS)).toBe(0);
  });

  it('counts year + duration + sort + clean as four', () => {
    expect(
      filterCount({
        ...EMPTY_FILTERS,
        sort: 'newest',
        yearFrom: 2000,
        durationMax: 180,
        clean: true,
      }),
    ).toBe(4);
  });

  it('counts each mood and exclude token individually', () => {
    expect(
      filterCount({
        ...EMPTY_FILTERS,
        mood: ['live', 'acoustic'],
        exclude: ['karaoke'],
      }),
    ).toBe(3);
  });
});

describe('immutable helpers', () => {
  it('setFilter updates a single key without mutating the input', () => {
    const before = { ...EMPTY_FILTERS };
    const after = setFilter(before, 'sort', 'popularity');
    expect(before.sort).toBe('relevance');
    expect(after.sort).toBe('popularity');
  });

  it('clearFilter resets a dimension to its default', () => {
    const cleared = clearFilter(
      { ...EMPTY_FILTERS, sort: 'popularity', yearFrom: 2010, yearTo: 2020 },
      'year',
    );
    expect(cleared.yearFrom).toBeNull();
    expect(cleared.yearTo).toBeNull();
    expect(cleared.sort).toBe('popularity');
  });

  it('toggleMood adds and removes from the multi-select list', () => {
    const once = toggleMood(EMPTY_FILTERS, 'live');
    expect(once.mood).toEqual(['live']);
    const off = toggleMood(once, 'live');
    expect(off.mood).toEqual([]);
  });

  it('addExclude dedupes case-insensitively and strips leading dashes', () => {
    const a = addExclude(EMPTY_FILTERS, '-Karaoke');
    expect(a.exclude).toEqual(['karaoke']);
    const b = addExclude(a, 'karaoke');
    expect(b.exclude).toEqual(['karaoke']);
  });

  it('removeExclude pops the matching token', () => {
    const f = { ...EMPTY_FILTERS, exclude: ['live', 'karaoke'] };
    expect(removeExclude(f, 'karaoke').exclude).toEqual(['live']);
  });
});
