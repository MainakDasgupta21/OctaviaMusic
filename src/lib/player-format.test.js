import { describe, it, expect } from 'vitest';
import { cleanTrackTitle, cleanArtistName } from './player-format';

describe('cleanTrackTitle', () => {
  it('strips video noise and a duplicated trailing artist', () => {
    expect(cleanTrackTitle('BELLAKEO (Video Oficial) - Peso Pluma', 'Peso Pluma')).toBe(
      'BELLAKEO',
    );
  });

  it('removes common bracketed descriptors', () => {
    expect(cleanTrackTitle('Blinding Lights (Official Music Video)')).toBe('Blinding Lights');
    expect(cleanTrackTitle('Levitating [Lyric Video]')).toBe('Levitating');
    expect(cleanTrackTitle('Song Title (Audio)')).toBe('Song Title');
    expect(cleanTrackTitle('Track (4K Remastered)')).toBe('Track');
  });

  it('keeps featured-artist credits intact', () => {
    expect(cleanTrackTitle('Stay (feat. Justin Bieber)')).toBe('Stay (feat. Justin Bieber)');
  });

  it('drops a leading "Artist - " when the artist is known', () => {
    expect(cleanTrackTitle('Drake - One Dance', 'Drake')).toBe('One Dance');
  });

  it('trims trailing pipe segments', () => {
    expect(cleanTrackTitle('Some Song | Provided to YouTube')).toBe('Some Song');
  });

  it('falls back to the original when scrubbing would empty it', () => {
    expect(cleanTrackTitle('(Official Video)')).toBe('(Official Video)');
  });

  it('handles missing input', () => {
    expect(cleanTrackTitle('')).toBe('');
    expect(cleanTrackTitle(undefined)).toBe('');
  });
});

describe('cleanArtistName', () => {
  it('removes YouTube auto-channel suffixes', () => {
    expect(cleanArtistName('Peso Pluma - Topic')).toBe('Peso Pluma');
    expect(cleanArtistName('TaylorSwiftVEVO')).toBe('TaylorSwift');
  });

  it('passes through clean names and handles empties', () => {
    expect(cleanArtistName('Peso Pluma')).toBe('Peso Pluma');
    expect(cleanArtistName('')).toBe('');
  });
});
