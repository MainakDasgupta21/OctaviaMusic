import { CheckCircle2, Compass, Sparkles } from 'lucide-react';
import Button from '@/components/ui-v2/Button';
import { cn } from '@/lib/utils';

const DailyChallengeCard = ({
  challenge = null,
  onStartChallenge,
  className,
}) => {
  if (!challenge) return null;
  const progress = Math.max(0, Math.min(challenge.target, challenge.progress || 0));
  const ratio = challenge.target > 0 ? progress / challenge.target : 0;

  return (
    <section
      className={cn(
        'mb-10 rounded-soft border border-white/[0.08] p-5 md:p-6',
        'bg-[radial-gradient(ellipse_65%_80%_at_10%_10%,hsl(var(--track-accent)/0.22),transparent_60%),hsl(var(--surface-2)/0.55)]',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow eyebrow-accent inline-flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Daily challenge
          </p>
          <h3 className="font-display text-2xl text-ink leading-tight">{challenge.title}</h3>
          <p className="font-editorial text-[13px] text-ink-3 mt-1 max-w-2xl">{challenge.description}</p>
        </div>

        <div className="rounded-sharp border border-white/[0.12] bg-surface-1/50 px-4 py-3 text-right">
          <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-4">Reward</p>
          <p className="font-display text-2xl text-ink">{challenge.rewardXp}</p>
          <p className="text-[11px] text-ink-3">XP bonus</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
          <span
            className={cn(
              'block h-full transition-[width] duration-500',
              challenge.completed
                ? 'bg-gradient-to-r from-emerald-400/85 to-lime-300/85'
                : 'bg-gradient-to-r from-track/80 to-violet-400/80',
            )}
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] text-ink-3">
            {progress}/{challenge.target} complete
          </p>
          {challenge.completed ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed
            </span>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onStartChallenge}
              leftIcon={<Compass className="w-3.5 h-3.5" />}
            >
              Continue challenge
            </Button>
          )}
        </div>
      </div>
    </section>
  );
};

export default DailyChallengeCard;
