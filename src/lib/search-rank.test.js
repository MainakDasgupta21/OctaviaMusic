import { describe, it, expect } from 'vitest';
import {
  parseMonthly,
  parsePlaysCount,
  parseQuery,
  popularityScore,
  rankAndMerge,
} from '@/lib/search-rank';

// Helpers to build server-shaped rows that mirror the DTOs the backend emits
// from `searchByType('all')` (see server/lib/mappers.js).
const song = ({ id, title, artist, rank, plays, kind }) => ({
  type: 'song',
  kind: kind || 'song',
  id,
  videoId: id,
  title,
  artist,
  thumbnail: null,
  rank: rank ?? null,
  plays: plays ?? null,
});

const artist = ({ id, name, rank, monthly, verified }) => ({
  type: 'artist',
  id,
  name,
  thumbnail: null,
  rank: rank ?? null,
  monthly: monthly ?? null,
  verified: verified ?? false,
});

const album = ({ id, title, artist: artistName, rank }) => ({
  type: 'album',
  id,
  title,
  artist: artistName,
  thumbnail: null,
  rank: rank ?? null,
});

describe('rankAndMerge — artist/album survival', () => {
  it('keeps artists and albums even when the query does not lexically match their names', () => {
    // The user typed a song title. The backend's per-type search returned
    // The Weeknd as the artist hit and "After Hours" as the album hit — both
    // are relevant context the user expects to see in the dropdown.
    const ranked = rankAndMerge({
      query: 'blinding lights',
      serverResults: [
        song({ id: 'abc11defabc', title: 'Blinding Lights', artist: 'The Weeknd' }),
        artist({ id: 'UCabc111111111111111111', name: 'The Weeknd' }),
        album({ id: 'MPREb_xyz', title: 'After Hours', artist: 'The Weeknd' }),
      ],
    });

    expect(ranked.songs.some((s) => s.title === 'Blinding Lights')).toBe(true);
    expect(ranked.artists.some((a) => a.name === 'The Weeknd')).toBe(true);
    expect(ranked.albums.some((a) => a.title === 'After Hours')).toBe(true);
  });

  it('still picks the song with the strongest match as the top result', () => {
    const ranked = rankAndMerge({
      query: 'blinding lights',
      serverResults: [
        artist({ id: 'UCabc111111111111111111', name: 'The Weeknd' }),
        album({ id: 'MPREb_xyz', title: 'After Hours', artist: 'The Weeknd' }),
        song({ id: 'abc11defabc', title: 'Blinding Lights', artist: 'The Weeknd' }),
      ],
    });

    expect(ranked.top).toBeTruthy();
    expect(ranked.top._kind).toBe('song');
    expect(ranked.top.title).toBe('Blinding Lights');
  });

  it('preserves the song score floor: unrelated songs are dropped', () => {
    // "Blinding Lights" matches the query; "Random Track" does not. Only the
    // matching song should survive once the floor is applied.
    const ranked = rankAndMerge({
      query: 'blinding lights',
      serverResults: [
        song({ id: 'abc11defabc', title: 'Blinding Lights', artist: 'The Weeknd' }),
        song({ id: 'zzz11noiseaa', title: 'Random Track', artist: 'Someone Else' }),
      ],
    });

    expect(ranked.songs.some((s) => s.title === 'Blinding Lights')).toBe(true);
    expect(ranked.songs.some((s) => s.title === 'Random Track')).toBe(false);
  });
});

describe('popularityScore', () => {
  it('decays by upstream rank with the top entry boosted strongest', () => {
    const top = popularityScore({ rank: 0 });
    const eighth = popularityScore({ rank: 8 });
    const twentieth = popularityScore({ rank: 20 });

    expect(top).toBeGreaterThan(150);
    expect(top).toBeGreaterThan(eighth);
    expect(eighth).toBeGreaterThan(twentieth);
  });

  it('boosts verified artists with monthly listeners', () => {
    const famous = popularityScore({
      type: 'artist',
      verified: true,
      monthly: '78.4M monthly listeners',
      rank: 0,
    });
    const indie = popularityScore({ type: 'artist', verified: false, rank: 0 });

    expect(famous).toBeGreaterThan(indie + 100);
  });

  it('returns 0 when no signals are present', () => {
    expect(popularityScore({})).toBe(0);
    expect(popularityScore(null)).toBe(0);
  });
});

describe('parsePlaysCount / parseMonthly', () => {
  it('parses suffixed counts', () => {
    expect(parsePlaysCount('78.4M monthly listeners')).toBe(78_400_000);
    expect(parsePlaysCount('1.2B plays')).toBeCloseTo(1_200_000_000);
    expect(parseMonthly('500k')).toBe(500_000);
  });

  it('passes through plain numbers', () => {
    expect(parsePlaysCount(6_200_000_000)).toBe(6_200_000_000);
    expect(parsePlaysCount('1234')).toBe(1234);
  });

  it('returns null for unparseable input', () => {
    expect(parsePlaysCount(null)).toBeNull();
    expect(parsePlaysCount(undefined)).toBeNull();
    expect(parsePlaysCount('   ')).toBeNull();
    expect(parsePlaysCount('not a number')).toBeNull();
  });
});

describe('parseQuery — intent + sort + multi-comparator', () => {
  it('exposes intent metadata on the parsed result', () => {
    const parsed = parseQuery('blinding lights live');
    expect(parsed.intent.intentTokens).toContain('live');
  });

  it('strips sort:* hints from the query terms and surfaces them via filters.sort', () => {
    const parsed = parseQuery('greatest hits sort:newest');
    expect(parsed.filters.sort).toBe('newest');
    expect(parsed.terms).toBe('greatest hits');
    expect(parsed.intent.sortHint).toBe('newest');
  });

  it('collects multiple year operators into an array filter', () => {
    const parsed = parseQuery('rock year>=2000 year<=2010');
    expect(Array.isArray(parsed.filters.year)).toBe(true);
    expect(parsed.filters.year).toHaveLength(2);
    const ops = parsed.filters.year.map((f) => f.op).sort();
    expect(ops).toEqual(['<=', '>=']);
  });

  it('detects clean / explicit intent flags', () => {
    expect(parseQuery('hits clean').intent.blockExplicit).toBe(true);
    expect(parseQuery('hits explicit').intent.requireExplicit).toBe(true);
  });
});

describe('rankAndMerge — intent and personalization', () => {
  it('boosts a song matching the user-typed intent (e.g. "live")', () => {
    // Two candidates with identical names. The "live" version should win
    // because the user's intent token matches its title.
    const ranked = rankAndMerge({
      query: 'blinding lights live',
      serverResults: [
        song({ id: 'studio01abcab', title: 'Blinding Lights', artist: 'The Weeknd' }),
        song({ id: 'live01abcabcd', title: 'Blinding Lights (Live)', artist: 'The Weeknd' }),
      ],
    });
    expect(ranked.top).toBeTruthy();
    expect(ranked.top.title).toBe('Blinding Lights (Live)');
  });

  it('boosts items whose artist appears in historyArtistCounts', () => {
    const counts = new Map([['the weeknd', 6]]);
    const ranked = rankAndMerge({
      query: 'starboy',
      serverResults: [
        song({ id: 'starOther1abc', title: 'Starboy', artist: 'Random Cover Artist' }),
        song({ id: 'starWeeknd123', title: 'Starboy', artist: 'The Weeknd' }),
      ],
      historyArtistCounts: counts,
    });
    expect(ranked.top.artist).toBe('The Weeknd');
  });

  it('treats SONG vs VIDEO as duplicates, suppressing the video version', () => {
    const ranked = rankAndMerge({
      query: 'blinding lights',
      serverResults: [
        {
          ...song({
            id: 'song01abcabc',
            title: 'Blinding Lights',
            artist: 'The Weeknd',
            kind: 'song',
            rank: 0,
          }),
        },
        {
          ...song({
            id: 'video1abcabc',
            title: 'Blinding Lights',
            artist: 'The Weeknd',
            kind: 'video',
            rank: 0,
          }),
        },
      ],
    });
    // Both retain entries (different videoId so no dedupe), but the SONG
    // beats the VIDEO since the video score is reduced by KIND_DUP_BIAS.
    expect(ranked.top.id).toBe('song01abcabc');
  });
});

describe('rankAndMerge — sort hints', () => {
  it('sortHint:newest reorders by year desc', () => {
    const ranked = rankAndMerge({
      query: 'hit',
      serverResults: [
        { ...song({ id: 'old001abcabc', title: 'Hit Song', artist: 'A' }), year: 1995 },
        { ...song({ id: 'mid001abcabc', title: 'Hit Song', artist: 'B' }), year: 2010 },
        { ...song({ id: 'new001abcabc', title: 'Hit Song', artist: 'C' }), year: 2024 },
      ],
      sortHint: 'newest',
    });
    expect(ranked.top.id).toBe('new001abcabc');
  });

  it('sortHint:shortest reorders by duration ascending', () => {
    const ranked = rankAndMerge({
      query: 'jam',
      serverResults: [
        { ...song({ id: 'longgg1abcabc', title: 'Jam', artist: 'A' }), durationSec: 600 },
        { ...song({ id: 'shrtt1abcabc', title: 'Jam', artist: 'B' }), durationSec: 90 },
        { ...song({ id: 'midbb1abcabc', title: 'Jam', artist: 'C' }), durationSec: 240 },
      ],
      sortHint: 'shortest',
    });
    expect(ranked.top.id).toBe('shrtt1abcabc');
  });
});

describe('rankAndMerge — explicit handling', () => {
  it('blockExplicit (clean keyword) drops explicit songs entirely', () => {
    const ranked = rankAndMerge({
      query: 'rap hit clean',
      serverResults: [
        { ...song({ id: 'cleancc1abcd', title: 'Rap Hit', artist: 'A' }), explicit: false },
        { ...song({ id: 'explcc1abcde', title: 'Rap Hit', artist: 'A' }), explicit: true },
      ],
    });
    const ids = ranked.songs.map((s) => s.id);
    expect(ids).toContain('cleancc1abcd');
    expect(ids).not.toContain('explcc1abcde');
  });
});

describe('rankAndMerge — popularity-aware ranking', () => {
  it('breaks score ties by upstream rank (top YTM hit wins)', () => {
    // Both songs are an exact match, so lexical scores tie. The one with
    // rank=0 should outrank rank=5.
    const ranked = rankAndMerge({
      query: 'blinding lights',
      serverResults: [
        song({
          id: 'mid01abcabc',
          title: 'Blinding Lights',
          artist: 'Cover Band',
          rank: 5,
        }),
        song({
          id: 'top01abcabc',
          title: 'Blinding Lights',
          artist: 'The Weeknd',
          rank: 0,
        }),
      ],
    });

    expect(ranked.top).toBeTruthy();
    expect(ranked.top.id).toBe('top01abcabc');
  });

  it('rescues a famous song below the lexical floor via popularity', () => {
    // "Blinding Lights" is the famous song; the user typed something that
    // barely overlaps it ("blinding lite"). Without the popularity rescue
    // the lexical floor would drop both. With it, the famous one survives
    // because its rank=0 + huge play count boost it above POPULARITY_RESCUE.
    const ranked = rankAndMerge({
      query: 'blinding lite',
      serverResults: [
        song({
          id: 'famous01abc',
          title: 'Blinding Lights',
          artist: 'The Weeknd',
          rank: 0,
          plays: 4_500_000_000,
        }),
        song({
          id: 'noise01abcd',
          title: 'Random Track',
          artist: 'Nobody',
        }),
      ],
    });

    expect(ranked.songs.some((s) => s.title === 'Blinding Lights')).toBe(true);
    expect(ranked.songs.some((s) => s.title === 'Random Track')).toBe(false);
  });

  it('lets a famous artist stay even when the query is a song title', () => {
    // The user typed a track title, not the artist name. Without popularity
    // the artist would be a low-score row; the type-survival rule already
    // keeps artists, but popularity ensures The Weeknd ranks ahead of any
    // unverified low-rank artist row.
    const ranked = rankAndMerge({
      query: 'blinding lights',
      serverResults: [
        song({ id: 'song01abcabc', title: 'Blinding Lights', artist: 'The Weeknd' }),
        artist({
          id: 'UCfame111111111111111',
          name: 'The Weeknd',
          verified: true,
          monthly: '90M monthly listeners',
          rank: 0,
        }),
        artist({
          id: 'UCnoise11111111111111',
          name: 'Some Cover Artist',
          verified: false,
          rank: 5,
        }),
      ],
    });

    expect(ranked.artists[0].name).toBe('The Weeknd');
  });
});
