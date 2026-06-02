import { cn } from '@/lib/utils';

/**
 * Editorial stat card — large serif numeral, italic label,
 * hairline-bordered icon container. Reads as a magazine sidebar figure.
 */
const Stat = ({ label, value, icon: Icon, hint, className }) => (
  <div
    className={cn(
      'group rounded-sharp p-5 flex items-start gap-4',
      'bg-surface-2/40 backdrop-blur-md border border-white/[0.06]',
      'hover:border-white/[0.14] transition-colors',
      className,
    )}
  >
    {Icon ? (
      <div className="w-10 h-10 rounded-sharp border border-white/[0.10] flex items-center justify-center text-ink-3 group-hover:text-track transition-colors flex-shrink-0">
        <Icon className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
      </div>
    ) : null}
    <div className="min-w-0 flex-1">
      <p className="font-display text-[34px] tabular-nums text-ink leading-none">
        {value}
      </p>
      <p className="font-editorial italic text-[13px] text-ink-3 mt-1.5 truncate leading-snug">
        {label}
      </p>
      {hint ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-4 mt-1 truncate">
          {hint}
        </p>
      ) : null}
    </div>
  </div>
);

export default Stat;
