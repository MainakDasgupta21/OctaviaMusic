import { describe, it, expect } from 'vitest';
import {
  isNotFoundError,
  isProviderError,
  isNetworkError,
  upgradeImageQuality,
  readApiBase,
} from '@/lib/api';

describe('api error sentinels', () => {
  it('isNotFoundError flags 404 axios errors only', () => {
    expect(isNotFoundError({ response: { status: 404 } })).toBe(true);
    expect(isNotFoundError({ response: { status: 500 } })).toBe(false);
    expect(isNotFoundError({})).toBe(false);
    expect(isNotFoundError(undefined)).toBe(false);
  });

  it('isProviderError flags 5xx axios errors', () => {
    expect(isProviderError({ response: { status: 502 } })).toBe(true);
    expect(isProviderError({ response: { status: 500 } })).toBe(true);
    expect(isProviderError({ response: { status: 404 } })).toBe(false);
  });

  it('isNetworkError flags transport-level failures (no response)', () => {
    expect(isNetworkError({ code: 'ERR_NETWORK' })).toBe(true);
    expect(isNetworkError(new Error('boom'))).toBe(true);
    expect(isNetworkError({ response: { status: 500 } })).toBe(false);
  });
});

describe('upgradeImageQuality', () => {
  it('rewrites to hqdefault for stable ytimg variants', () => {
    expect(
      upgradeImageQuality('https://i.ytimg.com/vi/abc/maxresdefault.jpg'),
    ).toBe('https://i.ytimg.com/vi/abc/hqdefault.jpg');
    expect(
      upgradeImageQuality('https://i.ytimg.com/vi/abc/sddefault.jpg'),
    ).toBe('https://i.ytimg.com/vi/abc/hqdefault.jpg');
    expect(
      upgradeImageQuality('https://i.ytimg.com/vi/abc/mqdefault.jpg'),
    ).toBe('https://i.ytimg.com/vi/abc/hqdefault.jpg');
  });

  it('upgrades googleusercontent size hints to s544', () => {
    expect(
      upgradeImageQuality('https://lh3.googleusercontent.com/x=w120-h120-l90'),
    ).toBe('https://lh3.googleusercontent.com/x=w544-h544-l90');
  });

  it('passes non-string input through unchanged', () => {
    expect(upgradeImageQuality(null)).toBeNull();
    expect(upgradeImageQuality(undefined)).toBeUndefined();
    expect(upgradeImageQuality(42)).toBe(42);
  });
});

describe('readApiBase', () => {
  it('returns a non-empty base URL', () => {
    const base = readApiBase();
    expect(typeof base).toBe('string');
    expect(base.length).toBeGreaterThan(0);
  });
});
