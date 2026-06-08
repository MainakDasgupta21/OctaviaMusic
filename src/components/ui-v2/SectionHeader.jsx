import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Editorial section header.
 *
 * Layout shape:
 *
 *   §03 · DISCOVER             [optional action]
 *   Trending now
 *   ─────────────────────────────────────────
 *   Hot tracks worth a listen.
 *
 * The numeric ornament (§03) plus the hairline rule under the title give the
 * page a magazine-spread rhythm without competing with track artwork.
 */
const SectionHeader = ({
  eyebrow,
  ordinal,
  title,
  subtitle,
  to,
  action,
  rule = true,
  className,
  size = 'md',
  id,
}) => {
  // Sizes: lg = display section, md = standard, sm = subsection
  const titleClass =
    size === 'lg'
      ? 'font-display text-display-md text-ink leading-none'
      : size === 'sm'
        ? 'font-display text-xl md:text-2xl text-ink leading-tight'
        : 'font-display text-display-sm md:text-display-md text-ink leading-[1.05] tracking-tight';

  return (
    <header className={cn('mb-5', className)}>
      <div className="flex items-end justify-between gap-4 mb-2">
        <div className="min-w-0">
          {(ordinal || eyebrow) ? (
            <div className="flex items-center gap-2.5 mb-2">
              {ordinal ? (
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-4">
                  §{String(ordinal).padStart(2, '0')}
                </span>
              ) : null}
              {(ordinal && eyebrow) ? (
                <span className="w-4 h-px bg-ink-4/40" aria-hidden="true" />
              ) : null}
              {eyebrow ? (
                <span className="eyebrow eyebrow-accent">
                  {eyebrow}
                </span>
              ) : null}
            </div>
          ) : null}
          <h2 id={id} className={cn(titleClass)}>
            {to ? (
              <Link
                to={to}
                className="inline-flex items-baseline gap-1.5 group focus-ring rounded-sm"
              >
                {title}
                <ChevronRight className="w-5 h-5 text-ink-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-short self-center" />
              </Link>
            ) : (
              title
            )}
          </h2>
        </div>
        {action ? <div className="flex items-center gap-2 pb-1">{action}</div> : null}
      </div>
      {rule ? <div className="editorial-rule" /> : null}
      {subtitle ? (
        <p className="text-label text-ink-3 mt-3 max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      ) : null}
    </header>
  );
};

export default SectionHeader;
