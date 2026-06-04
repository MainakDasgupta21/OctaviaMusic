import { describe, it, expect } from 'vitest';
import { rankAndMerge } from '@/lib/search-rank';

// Helpers to build server-shaped rows that mirror the DTOs the backend emits
// from `searchByType('all')` (see server/lib/mappers.js).
const song = ({ id, title, artist }) => ({
  type: 'song',
  id,
  videoId: id,
  title,
  artist,
  thumbnail: null,
});

const artist = ({ id, name }) => ({
  type: 'artist',
  id,
  name,
  thumbnail: null,
});

const album = ({ id, title, artist: artistName }) => ({
  type: 'album',
  id,
  title,
  artist: artistName,
  thumbnail: null,
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
