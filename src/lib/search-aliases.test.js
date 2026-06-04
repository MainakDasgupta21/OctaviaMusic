import { describe, it, expect } from 'vitest';
import {
  ALIAS_KEYS,
  ABBREVIATION_KEYS,
  collectExpansions,
  expandAbbreviation,
  resolveAlias,
} from '@/lib/search-aliases';

describe('search-aliases', () => {
  it('resolves common artist nicknames to canonical names', () => {
    expect(resolveAlias('mj')).toBe('michael jackson');
    expect(resolveAlias('MJ')).toBe('michael jackson'); // case-insensitive
    expect(resolveAlias('drizzy')).toBe('drake');
    expect(resolveAlias('arr')).toBe('a r rahman');
  });

  it('returns null for unknown aliases', () => {
    expect(resolveAlias('xyz')).toBeNull();
    expect(resolveAlias('')).toBeNull();
    expect(resolveAlias(null)).toBeNull();
  });

  it('expands shorthand abbreviations', () => {
    expect(expandAbbreviation('rmx')).toBe('remix');
    expect(expandAbbreviation('FT')).toBe('featuring');
    expect(expandAbbreviation('og')).toBe('original');
  });

  it('collects alias and abbreviation hits from a token list, deduped', () => {
    const result = collectExpansions(['mj', 'rmx', 'official', 'ft', 'mj']);
    expect(result.aliasTerms).toEqual(['michael jackson']);
    expect(result.abbreviationTokens).toEqual(['remix', 'featuring']);
  });

  it('returns empty arrays when no tokens match', () => {
    const result = collectExpansions(['blinding', 'lights']);
    expect(result.aliasTerms).toEqual([]);
    expect(result.abbreviationTokens).toEqual([]);
  });

  it('exposes the alias / abbreviation maps as frozen objects', () => {
    expect(Object.isFrozen(ALIAS_KEYS)).toBe(true);
    expect(Object.isFrozen(ABBREVIATION_KEYS)).toBe(true);
    expect(ALIAS_KEYS.mj).toBe('michael jackson');
    expect(ABBREVIATION_KEYS.rmx).toBe('remix');
  });
});
