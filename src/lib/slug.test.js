import { describe, it, expect } from 'vitest';
import {
  slugify,
  artistSlugFromName,
  artistSlugOf,
  isYouTubeChannelId,
  isUsableArtistSlug,
} from '@/lib/slug';

describe('slug helpers', () => {
  describe('slugify', () => {
    it('lowercases and replaces non-alphanumerics with single dashes', () => {
      expect(slugify('Daft Punk')).toBe('daft-punk');
      expect(slugify('  Mac Miller   ')).toBe('mac-miller');
    });

    it('strips diacritics so accented names route the same', () => {
      expect(slugify('Beyoncé')).toBe('beyonce');
      expect(slugify('Sigur Rós')).toBe('sigur-ros');
    });

    it('collapses punctuation and emoji to safe segments', () => {
      expect(slugify('AC/DC')).toBe('ac-dc');
      expect(slugify('Tyler, The Creator')).toBe('tyler-the-creator');
      expect(slugify('Drake 🦉')).toBe('drake');
    });

    it('trims leading and trailing dashes', () => {
      expect(slugify('--U2--')).toBe('u2');
      expect(slugify('!!!')).toBe('');
    });

    it('handles non-string and empty inputs', () => {
      expect(slugify(null)).toBe('');
      expect(slugify(undefined)).toBe('');
      expect(slugify('')).toBe('');
    });
  });

  describe('artistSlugFromName', () => {
    it('mirrors slugify for plain strings', () => {
      expect(artistSlugFromName('The 1975')).toBe('the-1975');
    });
  });

  describe('artistSlugOf', () => {
    it('prefers the canonical API slug when present', () => {
      expect(
        artistSlugOf({ artist: 'Daft Punk', artistSlug: 'UCabcdefghijklmnopqrstuv' }),
      ).toBe('UCabcdefghijklmnopqrstuv');
    });

    it('falls back to slug field for legacy payloads', () => {
      expect(artistSlugOf({ artist: 'Foo', slug: 'foo-bar' })).toBe('foo-bar');
    });

    it('derives from artist name when neither slug is present', () => {
      expect(artistSlugOf({ artist: 'Tame Impala' })).toBe('tame-impala');
    });

    it('returns empty string for empty/missing track', () => {
      expect(artistSlugOf(null)).toBe('');
      expect(artistSlugOf({})).toBe('');
    });
  });

  describe('isYouTubeChannelId', () => {
    it('accepts valid UC... ids', () => {
      expect(isYouTubeChannelId('UC1234567890ABCDEFGHIJ')).toBe(true);
    });

    it('rejects non-channel slugs', () => {
      expect(isYouTubeChannelId('daft-punk')).toBe(false);
      expect(isYouTubeChannelId('UCshort')).toBe(false);
      expect(isYouTubeChannelId(null)).toBe(false);
    });
  });

  describe('isUsableArtistSlug', () => {
    it('flags any non-empty string', () => {
      expect(isUsableArtistSlug('foo')).toBe(true);
      expect(isUsableArtistSlug('UC...')).toBe(true);
    });

    it('rejects empty/whitespace/non-strings', () => {
      expect(isUsableArtistSlug('')).toBe(false);
      expect(isUsableArtistSlug('   ')).toBe(false);
      expect(isUsableArtistSlug(null)).toBe(false);
      expect(isUsableArtistSlug(123)).toBe(false);
    });
  });
});
