import { Flame, ShieldCheck, Sparkles, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

const DiscoveryStreakBar = ({
  streakDays = 0,
  level = 1,
  xp = 0,
  xpToNextLevel = 0,
  progressToNext = 0,
  badgesCount = 0,
  challenge = null,
}) => (
  <section className="mb-8 rounded-soft border border-white/[0.08] bg-surface-2/50 p-4 md:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <p className="eyebrow eyebrow-accent inline-flex items-center gap-2">
        <Sparkles className="w-3.5 h-3.5" />
        Discovery loop
      </p>
      <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-4">
        Keep playing to unlock badges
      </p>
    </div>

    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="rounded-sharp border border-white/[0.08] bg-surface-1/45 p-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-4 mb-1">
          Streak
        </p>
        <p className="font-display text-2xl text-ink inline-flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-300" />
          {streakDays}
        </p>
        <p className="text-[12px] text-ink-3 mt-1">days in a row</p>
      </div>

      <div className="rounded-sharp border border-white/[0.08] bg-surface-1/45 p-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-4 mb-1">Level</p>
        <p className="font-display text-2xl text-ink inline-flex items-center gap-2">
          <Trophy className="w-5 h-5 text-emerald-300" />
          {level}
        </p>
        <p className="text-[12px] text-ink-3 mt-1">{xp} XP total</p>
      </div>

      <div className="rounded-sharp border border-white/[0.08] bg-surface-1/45 p-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-4 mb-1">Badges</p>
        <p className="font-display text-2xl text-ink inline-flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-violet-300" />
          {badgesCount}
        </p>
        <p className="text-[12px] text-ink-3 mt-1">earned so far</p>
      </div>

      <div className="rounded-sharp border border-white/[0.08] bg-surface-1/45 p-3">
        <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-ink-4 mb-1">
          Next level
        </p>
        <p className="font-display text-2xl text-ink">{xpToNextLevel}</p>
        <p className="text-[12px] text-ink-3 mt-1">XP to go</p>
      </div>
    </div>

    <div className="mt-4">
      <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
        <span
          className="block h-full bg-gradient-to-r from-track/80 via-emerald-400/80 to-violet-400/80 transition-[width]"
          style={{ width: `${Math.round(Math.max(0, Math.min(1, progressToNext)) * 100)}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-ink-3">
          {challenge?.completed ? 'Daily challenge completed' : challenge?.title || 'Daily challenge'}
        </p>
        <p
          className={cn(
            'text-[10px] font-mono uppercase tracking-[0.16em]',
            challenge?.completed ? 'text-emerald-300' : 'text-ink-4',
          )}
        >
          {challenge?.completed ? 'Reward claimed' : `${Math.round(progressToNext * 100)}% to next level`}
        </p>
      </div>
    </div>
  </section>
);

export default DiscoveryStreakBar;
