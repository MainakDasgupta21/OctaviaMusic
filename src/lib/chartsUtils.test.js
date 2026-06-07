import {
  buildChartsSearch,
  EMPTY_VALUE,
  flagFromCountry,
  flagFromCountryCode,
  formatCompactNumber,
  formatCountryName,
  formatStreamsLabel,
  formatStreamsShort,
  getHeroSubtitle,
  getRankDelta,
  normalizeMode,
  normalizeRegion,
  normalizeWindow,
  parseDurationToSeconds,
} from '@/lib/chartsUtils';

describe('chartsUtils', () => {
  it('normalizes legacy filter aliases', () => {
    expect(normalizeMode('trackS')).toBe('songs');
    expect(normalizeRegion('jp')).toBe('japan');
    expect(normalizeWindow('weekly')).toBe('this_week');
  });

  it('builds share query params with normalized values', () => {
    const query = buildChartsSearch({ mode: 'song', region: 'in', window: 'daily' });
    expect(query).toBe('mode=songs&region=india&window=today');
  });

  it('formats rank deltas for new/up/down/flat', () => {
    expect(getRankDelta(2, null).type).toBe('new');
    expect(getRankDelta(4, 10).label).toBe('\u2191 6');
    expect(getRankDelta(10, 4).label).toBe('\u2193 6');
    expect(getRankDelta(7, 7).label).toBe('\u2014');
  });

  it('parses m:ss duration safely', () => {
    expect(parseDurationToSeconds('3:24')).toBe(204);
    expect(parseDurationToSeconds('0:09')).toBe(9);
    expect(parseDurationToSeconds('bad')).toBe(0);
  });

  it('provides mode/window aware hero subtitles', () => {
    expect(
      getHeroSubtitle({ mode: 'songs', region: 'global', window: 'today' }),
    ).toContain('updated every 15 minutes');
    expect(
      getHeroSubtitle({ mode: 'artists', region: 'india', window: 'this_week' }),
    ).toContain('india');
  });

  describe('compact / exact formatters honour the "no invented values" contract', () => {
    it('returns the em-dash sentinel for null/0/NaN inputs', () => {
      expect(formatCompactNumber(null)).toBe(EMPTY_VALUE);
      expect(formatCompactNumber(undefined)).toBe(EMPTY_VALUE);
      expect(formatCompactNumber(0)).toBe(EMPTY_VALUE);
      expect(formatCompactNumber(Number.NaN)).toBe(EMPTY_VALUE);
      expect(formatStreamsShort(null)).toBe(EMPTY_VALUE);
      expect(formatStreamsLabel(null, 'today')).toBe(EMPTY_VALUE);
    });

    it('formats real numbers in compact and full forms', () => {
      expect(formatCompactNumber(48_231_402)).toBe('48.2M');
      expect(formatStreamsShort(48_231_402)).toBe('48.2M streams');
      expect(formatStreamsLabel(48_231_402, 'all_time')).toBe('48,231,402 all-time streams');
      expect(formatStreamsLabel(48_231_402, 'today')).toBe('48,231,402 streams today');
    });
  });

  describe('country flag + name derivation', () => {
    it('builds regional indicator pairs from ISO alpha-2 codes', () => {
      expect(flagFromCountryCode('US')).toBe('\uD83C\uDDFA\uD83C\uDDF8');
      expect(flagFromCountryCode('GB')).toBe('\uD83C\uDDEC\uD83C\uDDE7');
      expect(flagFromCountryCode('JP')).toBe('\uD83C\uDDEF\uD83C\uDDF5');
      expect(flagFromCountryCode('IN')).toBe('\uD83C\uDDEE\uD83C\uDDF3');
      expect(flagFromCountryCode('xy')).toBe('\uD83C\uDDFD\uD83C\uDDFE');
      expect(flagFromCountryCode('1')).toBe('');
      expect(flagFromCountryCode('')).toBe('');
    });

    it('accepts country names and codes interchangeably', () => {
      expect(flagFromCountry('United States')).toBe('\uD83C\uDDFA\uD83C\uDDF8');
      expect(flagFromCountry('united kingdom')).toBe('\uD83C\uDDEC\uD83C\uDDE7');
      expect(flagFromCountry('JP')).toBe('\uD83C\uDDEF\uD83C\uDDF5');
      expect(flagFromCountry('Atlantis')).toBe('');
      expect(flagFromCountry(null)).toBe('');
    });

    it('expands a 2-letter code into a readable display name', () => {
      expect(formatCountryName('US')).toMatch(/United States/i);
      expect(formatCountryName('GB')).toMatch(/United Kingdom|Britain/i);
      expect(formatCountryName('Japan')).toBe('Japan');
      expect(formatCountryName('')).toBe('');
    });
  });
});
