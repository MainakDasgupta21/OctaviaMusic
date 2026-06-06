import { useCallback, useId, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Editorial tabs.
 * - "pill" : sharp-corner pill row. Active = bg-surface-3 + track text + hairline ring.
 *           Indicator slides with layoutId (no gradient fill).
 * - "underline" : low-key serif row, track-accent rule underneath active.
 *
 * Accessibility:
 * - Roving tabindex: only the active tab is reachable via Tab; arrow keys move
 *   focus + selection between tabs (Left/Right, Home/End).
 * - Each tab exposes `aria-controls={panelId}` paired with the matching
 *   `<Tabs.Panel id={tabId}>` rendered below. Consumers are not required to
 *   render panels via this component — they may render their own
 *   `role="tabpanel"` wrapper using `tabPanelId(tabId)` exposed below.
 */
const tabPanelIdFromTab = (tabsId, tabId) => `${tabsId}-panel-${tabId}`;
const tabButtonIdFromTab = (tabsId, tabId) => `${tabsId}-tab-${tabId}`;

const Tabs = ({
  items,
  value,
  defaultValue,
  onValueChange,
  className,
  variant = 'underline',
  // Optional `aria-label` for the tablist itself. Strongly encouraged.
  ariaLabel,
}) => {
  const reactId = useId();
  const [internal, setInternal] = useState(defaultValue ?? items[0]?.id);
  const active = value ?? internal;
  const buttonsRef = useRef(new Map());

  const setActive = useCallback(
    (id) => {
      if (value === undefined) setInternal(id);
      onValueChange?.(id);
    },
    [onValueChange, value],
  );

  // Roving tabindex: arrow/Home/End move focus + selection. We move focus
  // explicitly (rather than relying on tabIndex alone) so the keyboard model
  // matches WAI-ARIA APG tabs pattern.
  const focusAt = useCallback((id) => {
    const node = buttonsRef.current.get(id);
    if (node) node.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      const idx = items.findIndex((it) => it.id === active);
      if (idx === -1) return;
      let nextIdx = idx;
      if (e.key === 'ArrowRight') nextIdx = (idx + 1) % items.length;
      else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + items.length) % items.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = items.length - 1;
      else return;
      e.preventDefault();
      const nextId = items[nextIdx]?.id;
      if (!nextId) return;
      setActive(nextId);
      focusAt(nextId);
    },
    [active, focusAt, items, setActive],
  );

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
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
            ref={(node) => {
              if (node) buttonsRef.current.set(it.id, node);
              else buttonsRef.current.delete(it.id);
            }}
            id={tabButtonIdFromTab(reactId, it.id)}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={tabPanelIdFromTab(reactId, it.id)}
            tabIndex={isActive ? 0 : -1}
            onClick={() => setActive(it.id)}
            className={cn(
              'relative inline-flex items-center gap-2 text-[13px] font-medium focus-ring transition-colors',
              variant === 'pill' ? 'px-3.5 py-1.5 rounded-sharp' : 'px-4 py-3',
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
                <span
                  className={cn(
                    'font-mono text-[10px] tabular-nums tracking-tight rounded-full px-1.5 py-[1px] border transition-colors',
                    isActive
                      ? 'text-bone bg-track/85 border-track/45'
                      : 'text-ink-4 bg-white/[0.04] border-white/[0.08]',
                  )}
                >
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

// Companion panel — render this where the tab content lives so each panel
// pairs with its tab via `aria-controls` / `aria-labelledby`. The `tabsId` /
// `tabId` props match the values used inside `<Tabs />` when a parent
// `useId()` is shared. For most call sites the convenience pattern is to
// just include `role="tabpanel"` + `id` directly on the consumer wrapper —
// this helper is provided for cases where strict pairing is needed.
export const TabsPanel = ({ tabsId, tabId, hidden = false, children, ...rest }) => (
  <div
    role="tabpanel"
    id={tabPanelIdFromTab(tabsId, tabId)}
    aria-labelledby={tabButtonIdFromTab(tabsId, tabId)}
    hidden={hidden || undefined}
    tabIndex={0}
    {...rest}
  >
    {children}
  </div>
);

export default Tabs;
