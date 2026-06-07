import { describe, it, expect } from 'vitest';
import { suggestFromText } from './search-filter-suggestions';
import { EMPTY_FILTERS } from './search-filter-state';

const blank = () => ({ ...EMPTY_FILTERS });
const findById = (list, id) => list.find((e) => e.id === id);

describe('suggestFromText', () => {
  it('returns [] for empty / whitespace input', () => {
    expect(suggestFromText('')).toEqual([]);
    expect(suggestFromText('   ')).toEqual([]);
    expect(suggestFromText(null)).toEqual([]);
    expect(suggestFromText(undefined)).toEqual([]);
  });

  it('suggests mood: live when the text contains "live"', () => {
    const out = suggestFromText('live at the apollo');
    const entry = findById(out, 'mood-live');
    expect(entry).toBeTruthy();
    const next = entry.apply(blank());
    expect(next.mood).toContain('live');
  });

  it('suggests multiple moods when multiple cues co-occur', () => {
    const out = suggestFromText('acoustic remix sessions');
    expect(findById(out, 'mood-acoustic')).toBeTruthy();
    expect(findById(out, 'mood-remix')).toBeTruthy();
  });

  it('does not match mood substrings (e.g. "remixed" should not match "remix")', () => {
    const out = suggestFromText('remixedversion');
    expect(findById(out, 'mood-remix')).toBeFalsy();
  });

  it('suggests a single-year range for an explicit 4-digit year', () => {
    const out = suggestFromText('hits from 1995');
    const entry = findById(out, 'year-1995');
    expect(entry).toBeTruthy();
    const next = entry.apply(blank());
    expect(next.yearFrom).toBe(1995);
    expect(next.yearTo).toBe(1995);
  });

  it('expands "the 90s" to 1990-1999', () => {
    const out = suggestFromText('the 90s pop');
    const entry = findById(out, 'decade-1990');
    expect(entry).toBeTruthy();
    const next = entry.apply(blank());
    expect(next.yearFrom).toBe(1990);
    expect(next.yearTo).toBe(1999);
  });

  it('expands "2020s" to 2020-2029', () => {
    const out = suggestFromText('best of 2020s');
    const entry = findById(out, 'decade-2020');
    expect(entry).toBeTruthy();
    const next = entry.apply(blank());
    expect(next.yearFrom).toBe(2020);
    expect(next.yearTo).toBe(2029);
  });

  it('suppresses single-year suggestion when it falls inside a decade match', () => {
    const out = suggestFromText('the 90s 1995');
    expect(findById(out, 'decade-1990')).toBeTruthy();
    expect(findById(out, 'year-1995')).toBeFalsy();
  });

  it('suggests "Under 3 min" on "short" cue', () => {
    const out = suggestFromText('something short');
    const entry = findById(out, 'duration-180');
    expect(entry).toBeTruthy();
    const next = entry.apply(blank());
    expect(next.durationMax).toBe(180);
  });

  it('parses an explicit "under 4 min" cue', () => {
    const out = suggestFromText('under 4 min sets');
    const entry = findById(out, 'duration-240');
    expect(entry).toBeTruthy();
    const next = entry.apply(blank());
    expect(next.durationMax).toBe(240);
  });

  it('dedupes identical suggestions (one entry per id)', () => {
    const out = suggestFromText('live live live concert');
    const moodLive = out.filter((e) => e.id === 'mood-live');
    expect(moodLive).toHaveLength(1);
  });

  it('apply transforms are pure (do not mutate input filters)', () => {
    const out = suggestFromText('acoustic 1985');
    const base = blank();
    const snapshot = JSON.stringify(base);
    for (const entry of out) {
      entry.apply(base);
    }
    expect(JSON.stringify(base)).toBe(snapshot);
  });
});
