import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SearchHighlight, { __testing } from '@/components/SearchHighlight';

const { computeSpans, fold } = __testing;

describe('SearchHighlight — span computation', () => {
  it('returns a single non-marked span when no tokens match', () => {
    const spans = computeSpans('Hello World', ['xyz']);
    expect(spans).toHaveLength(1);
    expect(spans[0].mark).toBe(false);
  });

  it('wraps matched substrings as marks while preserving original casing', () => {
    const spans = computeSpans('Blinding Lights', ['blinding']);
    expect(spans).toHaveLength(2);
    expect(spans[0]).toEqual({ text: 'Blinding', mark: true });
    expect(spans[1]).toEqual({ text: ' Lights', mark: false });
  });

  it('matches diacritic-insensitively', () => {
    const spans = computeSpans('Beyoncé', ['beyonce']);
    expect(spans[0].mark).toBe(true);
    expect(spans[0].text).toBe('Beyoncé');
  });

  it('skips tokens shorter than 2 characters', () => {
    const spans = computeSpans('A long title', ['a']);
    expect(spans).toHaveLength(1);
    expect(spans[0].mark).toBe(false);
  });

  it('handles empty text gracefully', () => {
    expect(computeSpans('', ['hello'])).toEqual([{ text: '', mark: false }]);
  });

  it('escapes regex special characters in tokens', () => {
    const spans = computeSpans('Plus (Live)', ['(live)']);
    // Token has regex specials; the helper should NOT throw and SHOULD match.
    expect(spans.some((s) => s.mark && s.text === '(Live)')).toBe(true);
  });
});

describe('fold', () => {
  it('strips diacritics and lowercases', () => {
    expect(fold('Beyoncé')).toBe('beyonce');
    expect(fold('Café')).toBe('cafe');
  });
});

describe('SearchHighlight — rendering', () => {
  it('renders text inside <mark> for token matches', () => {
    render(<SearchHighlight text="Blinding Lights" tokens={['blinding']} />);
    const mark = screen.getByText('Blinding');
    expect(mark.tagName.toLowerCase()).toBe('mark');
  });

  it('returns null for empty text', () => {
    const { container } = render(<SearchHighlight text="" tokens={['x']} />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render a mark when no token matches', () => {
    render(<SearchHighlight text="Hello World" tokens={['xyz']} />);
    expect(screen.queryByRole('mark')).toBeNull();
  });
});
