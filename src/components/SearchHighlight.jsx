import { useMemo } from 'react';
import { cn } from '@/lib/utils';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Strip diacritics + lowercase. Used to compute spans for highlighting on the
// folded form, then mapped back to indices in the *original* string so the
// rendered <mark> ranges line up with the text the user actually sees.
const fold = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const buildPattern = (tokens) => {
  const cleaned = tokens
    .map((t) => fold(t))
    .filter(Boolean)
    .filter((t) => t.length >= 2)
    .map(escapeRegex);
  if (!cleaned.length) return null;
  // Sort longest-first so a longer token wins overlapping matches.
  cleaned.sort((a, b) => b.length - a.length);
  return new RegExp(`(${cleaned.join('|')})`, 'gi');
};

const computeSpans = (text, tokens) => {
  const pattern = buildPattern(tokens);
  if (!pattern || !text) return [{ text, mark: false }];

  const folded = fold(text);
  const segments = [];
  let cursor = 0;
  let match;
  while ((match = pattern.exec(folded)) !== null) {
    if (match.index === pattern.lastIndex) {
      pattern.lastIndex += 1;
      continue;
    }
    if (match.index > cursor) {
      segments.push({ text: text.slice(cursor, match.index), mark: false });
    }
    const end = match.index + match[0].length;
    segments.push({ text: text.slice(match.index, end), mark: true });
    cursor = end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), mark: false });
  }
  return segments;
};

// Split a string into <mark>-wrapped segments based on a list of tokens.
// Used in the TopBar dropdown, SearchPage rows, and CommandPalette items so
// the user can see *why* a result matched their query.
export const SearchHighlight = ({
  text,
  tokens = [],
  className,
  markClassName,
}) => {
  const safeText = String(text ?? '');
  const tokenList = useMemo(
    () => (Array.isArray(tokens) ? tokens : tokens ? [tokens] : []),
    [tokens],
  );
  const segments = useMemo(() => computeSpans(safeText, tokenList), [safeText, tokenList]);

  if (!safeText) return null;
  if (segments.length === 1 && !segments[0].mark) {
    return <span className={className}>{safeText}</span>;
  }

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.mark ? (
          <mark
            key={i}
            className={cn(
              'rounded-[2px] px-0.5 py-0 bg-track/15 text-accent font-medium',
              markClassName,
            )}
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </span>
  );
};

export const __testing = { computeSpans, fold, buildPattern };

export default SearchHighlight;
