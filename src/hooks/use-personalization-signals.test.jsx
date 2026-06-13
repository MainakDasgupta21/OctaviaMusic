import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { __testing as personalization, usePersonalizationSignals } from '@/hooks/use-personalization-signals';

const { buildArtistCounts, pickTopArtists } = personalization;

const playerHistoryMock = vi.fn();
vi.mock('@/contexts/PlayerContext', () => ({
  usePlayer: () => ({ history: playerHistoryMock() }),
}));

const searchHistoryMock = vi.fn();
vi.mock('@/contexts/SearchHistoryContext', () => ({
  useSearchHistory: () => ({ searches: searchHistoryMock() }),
}));

describe('buildArtistCounts', () => {
  it('counts plays per normalized artist name', () => {
    const counts = buildArtistCounts([
      { artist: 'The Weeknd' },
      { artist: 'The Weeknd' },
      { artist: 'Drake' },
      { artist: 'the weeknd' },
    ]);
    expect(counts.get('the weeknd')).toBe(3);
    expect(counts.get('drake')).toBe(1);
  });

  it('skips entries without an artist field', () => {
    const counts = buildArtistCounts([{ title: 'Untitled' }, { artist: '' }, { artist: null }]);
    expect(counts.size).toBe(0);
  });

  it('caps the input window at 100 plays', () => {
    const long = Array.from({ length: 200 }, (_, i) => ({
      artist: i < 100 ? 'A' : 'B',
    }));
    const counts = buildArtistCounts(long);
    expect(counts.get('a')).toBe(100);
    expect(counts.has('b')).toBe(false);
  });
});

describe('pickTopArtists', () => {
  it('returns the artists with the highest play counts, descending', () => {
    const counts = new Map([
      ['drake', 4],
      ['the weeknd', 9],
      ['rihanna', 2],
    ]);
    expect(pickTopArtists(counts)).toEqual(['the weeknd', 'drake', 'rihanna']);
  });

  it('omits artists with zero plays', () => {
    const counts = new Map([
      ['drake', 0],
      ['the weeknd', 1],
    ]);
    expect(pickTopArtists(counts)).toEqual(['the weeknd']);
  });
});

describe('usePersonalizationSignals', () => {
  beforeEach(() => {
    playerHistoryMock.mockReset();
    playerHistoryMock.mockReturnValue([
      { artist: 'The Weeknd' },
      { artist: 'Drake' },
      { artist: 'The Weeknd' },
    ]);
    searchHistoryMock.mockReset();
    searchHistoryMock.mockReturnValue([]);
  });

  it('returns historyArtistCounts derived from the player history', () => {
    const { result } = renderHook(() => usePersonalizationSignals());
    expect(result.current.historyArtistCounts.get('the weeknd')).toBe(2);
    expect(result.current.topPlayedArtists[0]).toBe('the weeknd');
  });

  it('reads recent search terms from the search history hook', () => {
    searchHistoryMock.mockReturnValue(['blinding lights', 'starboy']);
    const { result } = renderHook(() => usePersonalizationSignals());
    expect(result.current.recentSearchTerms.has('blinding lights')).toBe(true);
    expect(result.current.recentSearchTerms.has('starboy')).toBe(true);
  });

  it('returns an empty Set when there are no recent searches', () => {
    const { result } = renderHook(() => usePersonalizationSignals());
    expect(result.current.recentSearchTerms.size).toBe(0);
  });
});
