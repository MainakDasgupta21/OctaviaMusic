import { describe, expect, it } from 'vitest';
import { buildSmartQueueFromSeed } from '@/lib/smart-queue';

const track = ({
  id,
  artist,
  title,
  album = '',
  genre = [],
  mood = [],
}) => ({
  id,
  videoId: String(id)
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .padEnd(11, 'x')
    .slice(0, 11),
  artist,
  title,
  album,
  genre,
  mood,
});

describe('smart-queue', () => {
  it('prioritizes artist/genre/mood matches around the seed', () => {
    const seed = track({
      id: 'seed-track-1',
      artist: 'Neon Artist',
      title: 'Midnight Drive',
      album: 'Night Shift',
      genre: ['synthwave', 'electronic'],
      mood: ['night', 'chill'],
    });

    const queue = buildSmartQueueFromSeed({
      seedTrack: seed,
      remoteCandidates: [
        track({
          id: 'same-artist-1',
          artist: 'Neon Artist',
          title: 'City Lights',
          album: 'Night Shift',
          genre: ['synthwave'],
          mood: ['night'],
        }),
        track({
          id: 'genre-match-1',
          artist: 'Another Artist',
          title: 'Dark Highway',
          genre: ['electronic'],
          mood: ['chill'],
        }),
        track({
          id: 'unrelated-1',
          artist: 'Unrelated',
          title: 'Morning Birds',
          genre: ['acoustic'],
          mood: ['happy'],
        }),
      ],
      history: [
        track({
          id: 'history-1',
          artist: 'Neon Artist',
          title: 'Late Night Echo',
          genre: ['synthwave'],
        }),
      ],
      limit: 3,
    });

    expect(queue.map((row) => row.id)).toContain('same-artist-1');
    expect(queue[0]?.id).toBe('same-artist-1');
    expect(queue.map((row) => row.id)).not.toContain(seed.id);
  });

  it('respects per-artist diversity cap when ranking recommendations', () => {
    const seed = track({
      id: 'seed-track-2',
      artist: 'Seed Artist',
      title: 'Anchor',
      genre: ['pop'],
    });

    const queue = buildSmartQueueFromSeed({
      seedTrack: seed,
      remoteCandidates: [
        track({ id: 'a1', artist: 'Artist A', title: 'A One', genre: ['pop'] }),
        track({ id: 'a2', artist: 'Artist A', title: 'A Two', genre: ['pop'] }),
        track({ id: 'b1', artist: 'Artist B', title: 'B One', genre: ['pop'] }),
        track({ id: 'c1', artist: 'Artist C', title: 'C One', genre: ['pop'] }),
      ],
      limit: 4,
      maxPerArtist: 1,
    });

    const artists = queue.map((row) => row.artist);
    expect(new Set(artists.slice(0, 3)).size).toBe(3);
    expect(artists.filter((name) => name === 'Artist A').length).toBeLessThanOrEqual(2);
  });
});
