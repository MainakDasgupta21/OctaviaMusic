import { cn } from '@/lib/utils';

/**
 * SectionRule
 *
 * The lightweight sibling to `<SectionHeader>`. Where SectionHeader introduces
 * a new editorial block at the top, SectionRule sits BETWEEN sub-sections
 * inside one — e.g. between Songs / Artists / Albums on the SearchPage, or
 * between groups in the sidebar.
 *
 *     §02 ── ARTISTS ───────────────────────  [trailing slot]
 *
 * Layout: an optional `§NN` ordinal on the left, an optional small-caps
 * label, a hairline that expands to fill, and an optional `trailing` slot
 * (typically a "View all" link or counter).
 *
 * Props:
 *   - ordinal: string|number  — renders as `§02` (zero-padded to 2 digits)
 *   - label:   string         — small-caps editorial label
 *   - trailing: ReactNode     — slot at the right edge, vertically centered
 *   - tone:    'default' | 'accent'  — colour the label / ordinal
 *   - className: string       — extra classes on the outer <div>
 *   - id:      string         — anchor for skip-links
 */
const SectionRule = ({
  ordinal,
  label,
  trailing,
  tone = 'default',
  className,
  id,
}) => {
  const labelColor = tone === 'accent' ? 'text-accent' : 'text-ink-3';
  const ordinalColor = tone === 'accent' ? 'text-accent/70' : 'text-ink-4';
  return (
    <div
      id={id}
      role="separator"
      aria-label={label}
      className={cn('flex items-center gap-3 my-6 select-none', className)}
    >
      {ordinal ? (
        <span
          className={cn(
            'font-mono text-[10px] tracking-[0.22em] uppercase shrink-0',
            ordinalColor,
          )}
          aria-hidden="true"
        >
          §{String(ordinal).padStart(2, '0')}
        </span>
      ) : null}
      <span
        aria-hidden="true"
        className="h-px w-6 bg-ink-4/30 shrink-0"
      />
      {label ? (
        <span className={cn('eyebrow shrink-0 inline-flex items-center gap-2', labelColor)}>
          <span className="w-1 h-1 rounded-full bg-track shrink-0" aria-hidden="true" />
          {label}
        </span>
      ) : null}
      <span
        aria-hidden="true"
        className={cn(
          'h-px flex-1',
          // The hairline fades from the label side toward the trailing side
          // for a hand-drawn, magazine-deck feel rather than a flat HR.
          'bg-gradient-to-r from-ink-4/30 via-ink-4/12 to-transparent',
        )}
      />
      {trailing ? (
        <div className="flex items-center gap-2 shrink-0">{trailing}</div>
      ) : null}
    </div>
  );
};

export default SectionRule;
