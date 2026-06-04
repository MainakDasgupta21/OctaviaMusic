import { describe, it, expect } from 'vitest';
import {
  sanitizeImageUrl,
  sanitizeVideoId,
  sanitizeTrack,
  sanitizeTrackList,
  pickPlaceholder,
  isSafeImageUrl,
} from '@/lib/media-sanitize';

describe('media-sanitize', () => {
  describe('sanitizeImageUrl', () => {
    it('passes safe https hosts through verbatim', () => {
      expect(sanitizeImageUrl('https://i.ytimg.com/vi/abc/hqdefault.jpg')).toBe(
        'https://i.ytimg.com/vi/abc/hqdefault.jpg',
      );
      expect(sanitizeImageUrl('https://lh3.googleusercontent.com/x=s544')).toBe(
        'https://lh3.googleusercontent.com/x=s544',
      );
    });

    it('rewrites maxresdefault to hqdefault for ytimg URLs', () => {
      expect(
        sanitizeImageUrl('https://i.ytimg.com/vi/abc/maxresdefault.jpg'),
      ).toBe('https://i.ytimg.com/vi/abc/hqdefault.jpg');
    });

    it('preserves relative URLs (placeholders, public assets)', () => {
      expect(sanitizeImageUrl('/placeholders/track.svg')).toBe(
        '/placeholders/track.svg',
      );
    });

    it('preserves data: image URIs', () => {
      const dataUri = 'data:image/svg+xml;utf8,<svg/>';
      expect(sanitizeImageUrl(dataUri)).toBe(dataUri);
    });

    it('rejects unsafe hosts and non-http(s) protocols', () => {
      expect(sanitizeImageUrl('https://malicious.example.com/x.jpg')).toBeNull();
      expect(sanitizeImageUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeImageUrl('ftp://foo.com/x.jpg')).toBeNull();
    });

    it('returns the supplied fallback for invalid inputs', () => {
      expect(sanitizeImageUrl('', { fallback: '/x.svg' })).toBe('/x.svg');
      expect(sanitizeImageUrl(null, { fallback: '/x.svg' })).toBe('/x.svg');
      expect(sanitizeImageUrl(undefined, { fallback: '/x.svg' })).toBe('/x.svg');
    });
  });

  describe('sanitizeVideoId', () => {
    it('accepts valid 11-char YouTube ids', () => {
      expect(sanitizeVideoId('JGwWNGJdvx8')).toBe('JGwWNGJdvx8');
      expect(sanitizeVideoId('  JGwWNGJdvx8  ')).toBe('JGwWNGJdvx8');
    });

    it('rejects malformed ids', () => {
      expect(sanitizeVideoId('short')).toBeNull();
      expect(sanitizeVideoId('toolongggggggggggg')).toBeNull();
      expect(sanitizeVideoId('has spaces!')).toBeNull();
      expect(sanitizeVideoId(null)).toBeNull();
    });
  });

  describe('sanitizeTrack', () => {
    const base = {
      id: 'JGwWNGJdvx8',
      videoId: 'JGwWNGJdvx8',
      title: 'One More Time',
      artist: 'Daft Punk',
      thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/maxresdefault.jpg',
    };

    it('returns a sanitized track with playable=true when videoId is valid', () => {
      const result = sanitizeTrack(base);
      expect(result.id).toBe('JGwWNGJdvx8');
      expect(result.videoId).toBe('JGwWNGJdvx8');
      expect(result.thumbnail).toBe('https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg');
      expect(result.playable).toBe(true);
    });

    it('marks playable=false when videoId cannot be derived', () => {
      const result = sanitizeTrack({ ...base, id: 'stub-1', videoId: null });
      expect(result.playable).toBe(false);
      expect(result.videoId).toBeNull();
    });

    it('drops unplayable rows when requirePlayable is set', () => {
      const result = sanitizeTrack(
        { ...base, id: 'stub-1', videoId: null },
        { requirePlayable: true },
      );
      expect(result).toBeNull();
    });

    it('returns null for invalid input', () => {
      expect(sanitizeTrack(null)).toBeNull();
      expect(sanitizeTrack({})).toBeNull();
      expect(sanitizeTrack({ id: '' })).toBeNull();
    });
  });

  describe('sanitizeTrackList', () => {
    it('filters out invalid entries', () => {
      const rows = [
        { id: 'JGwWNGJdvx8' },
        null,
        { id: '' },
        { id: '2Vv-BfVoq4g' },
      ];
      expect(sanitizeTrackList(rows)).toHaveLength(2);
    });

    it('returns [] for non-array input', () => {
      expect(sanitizeTrackList(null)).toEqual([]);
      expect(sanitizeTrackList({})).toEqual([]);
    });
  });

  describe('pickPlaceholder', () => {
    it('returns the type-specific placeholder', () => {
      expect(pickPlaceholder('album')).toBe('/placeholders/album.svg');
      expect(pickPlaceholder('artist')).toBe('/placeholders/artist.svg');
    });

    it('falls back to track placeholder for unknown kinds', () => {
      expect(pickPlaceholder('unknown')).toBe('/placeholders/track.svg');
      expect(pickPlaceholder()).toBe('/placeholders/track.svg');
    });
  });

  describe('isSafeImageUrl', () => {
    it('returns true for safe values and false for unsafe', () => {
      expect(isSafeImageUrl('https://i.ytimg.com/vi/x/hqdefault.jpg')).toBe(true);
      expect(isSafeImageUrl('javascript:alert(1)')).toBe(false);
    });
  });
});
