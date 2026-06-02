import { useId, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Editorial tabs.
 * - "pill" : sharp-corner pill row. Active = bg-surface-3 + track text + hairline ring.
 *           Indicator slides with layoutId (no gradient fill).
 * - "underline" : low-key serif row, track-accent rule underneath active.
 */
const Tabs = ({
  items,
  value,
  defaultValue,
  onValueChange,
  className,
  variant = 'underline',
}) => {
  const reactId = useId();
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.id);
  const active = value ?? internal;
  const setActive = (id) => {
    if (value === undefined) setInternal(id);
    onValueChange?.(id);
  };

  return (
    <div
      role="tablist"
      className={cn(
        variant === 'pill'
          ? 'inline-flex p-1 rounded-sharp bg-surface-2/40 border border-white/[0.08] gap-1'
          : 'inline-flex border-b border-white/[0.08] gap-1',
        className,
      )}
    >
      {items.map((it) => {
        const isActive = active === it.id;
        return (
          <button
            key={it.id}
            role="tab"
            type="button"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => setActive(it.id)}
            className={cn(
              'relative inline-flex items-center gap-2 text-[13px] font-medium focus-ring transition-colors',
              variant === 'pill'
                ? 'px-3.5 py-1.5 rounded-sharp'
                : 'px-4 py-3',
              isActive
                ? variant === 'pill'
                  ? 'text-accent'
                  : 'text-ink'
                : 'text-ink-3 hover:text-ink',
            )}
          >
            {variant === 'pill' && isActive && (
              <motion.span
                layoutId={`tabs-pill-${reactId}`}
                className="absolute inset-0 rounded-sharp bg-surface-3 ring-1 ring-track/40 -z-0"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-2">
              {it.icon ? <it.icon className="w-3.5 h-3.5" strokeWidth={1.75} /> : null}
              {it.label}
              {typeof it.count === 'number' ? (
                <span className="font-mono text-ink-3 text-[11px] tabular-nums tracking-tight">
                  {it.count}
                </span>
              ) : null}
            </span>
            {variant === 'underline' && isActive && (
              <motion.span
                layoutId={`tabs-underline-${reactId}`}
                className="absolute -bottom-px left-2 right-2 h-px bg-track"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
