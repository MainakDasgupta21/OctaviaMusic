import { cn } from '@/lib/utils';

const Kbd = ({ keys, className }) => {
  const list = Array.isArray(keys) ? keys : [keys];
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {list.map((k, i) => (
        <kbd
          key={`${k}-${i}`}
          className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-sharp border border-white/[0.10] bg-surface-0/70 text-[10px] font-medium text-ink-2 font-mono tracking-tight"
        >
          {k}
        </kbd>
      ))}
    </span>
  );
};

export default Kbd;
