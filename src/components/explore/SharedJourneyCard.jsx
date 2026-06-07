import { CheckCircle2, Play, Share2 } from 'lucide-react';
import Button from '@/components/ui-v2/Button';
import { cn } from '@/lib/utils';

const SharedJourneyCard = ({
  journey,
  onPlay,
  onShare,
}) => {
  if (!journey) return null;
  return (
    <article
      className={cn(
        'rounded-sharp border border-white/[0.08] bg-surface-2/45 p-4',
        journey.completed && 'border-emerald-400/35',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-4 mb-1">
            Shared journey
          </p>
          <h4 className="font-display text-xl text-ink leading-tight">{journey.title}</h4>
          <p className="font-editorial text-[13px] text-ink-3 mt-1 line-clamp-2">
            {journey.blurb}
          </p>
        </div>
        {journey.completed ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.15em] text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onPlay?.(journey)}
          leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
        >
          Start
        </Button>
        <Button
          type="button"
          size="sm"
          variant="glass"
          onClick={() => onShare?.(journey)}
          leftIcon={<Share2 className="w-3.5 h-3.5" />}
        >
          Share
        </Button>
      </div>
    </article>
  );
};

export default SharedJourneyCard;
