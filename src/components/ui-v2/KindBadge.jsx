import { Video } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// KindBadge — tiny visual hint for non-song catalog entries. Today the only
// "interesting" kind is `video` (a music-video result that isn't a regular
// track). Songs render nothing so the table doesn't bloat for the 95% case.
// =============================================================================

const LABELS = {
  video: { icon: Video, label: 'Video' },
};

const KindBadge = ({ kind, className }) => {
  const config = kind && LABELS[kind];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-1.5 py-[1px] text-[9px] font-mono uppercase tracking-[0.16em]',
        'text-info bg-info/[0.10] border border-info/30',
        className,
      )}
      aria-label={`${config.label} result`}
    >
      <Icon className="w-2.5 h-2.5" strokeWidth={2.25} />
      {config.label}
    </span>
  );
};

export default KindBadge;
