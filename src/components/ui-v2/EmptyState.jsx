import { cn } from '@/lib/utils';

/**
 * Editorial empty state.
 * Hairline-outlined icon ring, serif title with optional italic accent,
 * Fraunces description, and inline action(s).
 */
const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  accent,
}) => (
  <div
    className={cn(
      'text-center py-20 px-4 max-w-md mx-auto',
      className,
    )}
  >
    {Icon ? (
      <div className="w-20 h-20 mx-auto mb-7 rounded-full border border-white/[0.10] flex items-center justify-center relative">
        {/* Inner accent ring */}
        <span
          aria-hidden="true"
          className="absolute inset-[6px] rounded-full border border-white/[0.04]"
        />
        <Icon
          className="w-8 h-8 text-track"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </div>
    ) : null}
    <h3 className="font-display text-2xl text-ink leading-tight mb-3">
      {title}
      {accent ? (
        <>
          {' '}
          <em className="font-editorial text-track not-italic">{accent}</em>
        </>
      ) : null}
    </h3>
    {description ? (
      <p className="font-editorial italic text-[14px] text-ink-3 leading-relaxed">
        {description}
      </p>
    ) : null}
    {action ? (
      <div className="mt-7 flex justify-center gap-3 flex-wrap">{action}</div>
    ) : null}
  </div>
);

export default EmptyState;
