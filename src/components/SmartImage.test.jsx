import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import SmartImage from '@/components/SmartImage';

const getImg = (container) => container.querySelector('img');

describe('SmartImage fallback chain', () => {
  it('falls through hqdefault to the type-specific placeholder on repeated errors', () => {
    const { container } = render(
      <SmartImage
        src="https://i.ytimg.com/vi/abc/maxresdefault.jpg"
        alt="cover"
        kind="album"
      />,
    );

    const img = getImg(container);
    expect(img).toBeTruthy();
    // Sanitized maxres rewrites to hqdefault, so the chain starts there.
    expect(img.getAttribute('src')).toBe(
      'https://i.ytimg.com/vi/abc/hqdefault.jpg',
    );

    fireEvent.error(img);
    expect(img.getAttribute('src')).toBe('/placeholders/album.svg');

    fireEvent.error(img);
    expect(img.getAttribute('src')).toBe('/placeholders/album.svg');
  });

  it('uses the track placeholder when no kind is provided', () => {
    const { container } = render(<SmartImage src={null} alt="" />);
    const img = getImg(container);
    expect(img.getAttribute('src')).toBe('/placeholders/track.svg');
  });

  it('respects an explicit fallbackSrc before the kind placeholder', () => {
    const { container } = render(
      <SmartImage
        src="https://i.ytimg.com/vi/x/hqdefault.jpg"
        kind="album"
        fallbackSrc="/custom/fallback.svg"
      />,
    );
    const img = getImg(container);

    fireEvent.error(img);
    expect(img.getAttribute('src')).toBe('/custom/fallback.svg');

    fireEvent.error(img);
    expect(img.getAttribute('src')).toBe('/placeholders/album.svg');
  });

  it('sets safe img attributes (decoding, referrerPolicy, lazy load)', () => {
    const { container } = render(
      <SmartImage src="/placeholders/track.svg" alt="x" />,
    );
    const img = getImg(container);
    expect(img.getAttribute('loading')).toBe('lazy');
    expect(img.getAttribute('decoding')).toBe('async');
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer');
  });
});
