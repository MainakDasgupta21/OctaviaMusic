import { describe, it, expect } from 'vitest';
import {
  detectSortHint,
  emptyIntent,
  expandIntent,
  stripSortHints,
} from '@/lib/search-intent';

describe('detectSortHint', () => {
  it('recognises every supported sort keyword', () => {
    expect(detectSortHint('foo sort:newest')).toBe('newest');
    expect(detectSortHint('sort:latest foo')).toBe('newest');
    expect(detectSortHint('sort:popularity')).toBe('popularity');
    expect(detectSortHint('sort:popular')).toBe('popularity');
    expect(detectSortHint('sort:shortest')).toBe('shortest');
    expect(detectSortHint('sort:short')).toBe('shortest');
    expect(detectSortHint('sort:relevance')).toBe('relevance');
  });

  it('returns null when no sort hint is present', () => {
    expect(detectSortHint('')).toBeNull();
    expect(detectSortHint('blinding lights')).toBeNull();
    expect(detectSortHint('sort:weird')).toBeNull();
  });
});

describe('stripSortHints', () => {
  it('removes the operator and collapses whitespace', () => {
    expect(stripSortHints('blinding lights sort:newest')).toBe('blinding lights');
    expect(stripSortHints('sort:popular   beatles')).toBe('beatles');
    expect(stripSortHints('one sort:short two')).toBe('one two');
  });

  it('passes through queries without a sort hint', () => {
    expect(stripSortHints('hello world')).toBe('hello world');
  });
});

describe('expandIntent', () => {
  it('flags intent keywords found in the tokens', () => {
    const result = expandIntent({
      tokens: ['blinding', 'lights', 'live'],
      terms: 'blinding lights live',
      raw: 'blinding lights live',
    });
    expect(result.intentTokens).toContain('live');
  });

  it('treats `feat` / `ft` / `featuring` as an intent', () => {
    const a = expandIntent({
      tokens: ['shape', 'of', 'you', 'feat'],
      terms: 'shape of you feat',
      raw: 'shape of you feat',
    });
    const b = expandIntent({
      tokens: ['shape', 'of', 'you'],
      terms: 'shape of you ft someone',
      raw: 'shape of you ft someone',
    });
    expect(a.intentTokens).toContain('feat');
    expect(b.intentTokens).toContain('feat');
  });

  it('exposes alias terms when shorthand artist names are typed', () => {
    const result = expandIntent({
      tokens: ['mj', 'thriller'],
      terms: 'mj thriller',
      raw: 'mj thriller',
    });
    expect(result.aliasTerms).toContain('michael jackson');
  });

  it('exposes abbreviation tokens like `rmx` -> `remix`', () => {
    const result = expandIntent({
      tokens: ['rmx', 'house'],
      terms: 'rmx house',
      raw: 'rmx house',
    });
    expect(result.abbreviationTokens).toContain('remix');
  });

  it('reads `clean` and `explicit` keywords', () => {
    const clean = expandIntent({
      tokens: ['rap', 'clean'],
      terms: 'rap clean',
      raw: 'rap clean',
    });
    expect(clean.blockExplicit).toBe(true);
    expect(clean.requireExplicit).toBeNull();

    const explicit = expandIntent({
      tokens: ['rap', 'explicit'],
      terms: 'rap explicit',
      raw: 'rap explicit',
    });
    expect(explicit.requireExplicit).toBe(true);
    expect(explicit.blockExplicit).toBeNull();
  });

  it('reads `sort:newest` from the raw query', () => {
    const result = expandIntent({
      tokens: ['hits'],
      terms: 'hits',
      raw: 'hits sort:newest',
    });
    expect(result.sortHint).toBe('newest');
  });

  it('emptyIntent returns a fully-zeroed object', () => {
    const empty = emptyIntent();
    expect(empty.intentTokens).toEqual([]);
    expect(empty.aliasTerms).toEqual([]);
    expect(empty.abbreviationTokens).toEqual([]);
    expect(empty.sortHint).toBeNull();
    expect(empty.blockExplicit).toBeNull();
    expect(empty.requireExplicit).toBeNull();
  });
});
