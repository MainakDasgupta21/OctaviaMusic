import { motion } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
} from 'lucide-react';
import useTransportActions from '@/hooks/use-transport-actions';
import { isReducedMotion } from '@/design/motion';
import { cn } from '@/lib/utils';

const skipBtn = (disabled) =>
  cn(
    'p-2.5 rounded-full transition-colors focus-ring',
    disabled
      ? 'text-ink-4 bg-white/[0.02] cursor-not-allowed'
      : 'text-ink-2 hover:text-ink bg-white/[0.03] hover:bg-white/[0.08]',
  );

const toggleBtn = (active) =>
  cn(
    'relative p-2 rounded-full transition-colors focus-ring',
    active ? 'text-accent' : 'text-ink-3 hover:text-ink hover:bg-white/[0.05]',
  );

const ActiveDot = () => (
  <span
    aria-hidden="true"
    className="absolute left-1/2 -bottom-0.5 -translate-x-1/2 w-1 h-1 rounded-full bg-accent"
  />
);

const TransportControls = () => {
  const {
    isPlaying,
    shuffle,
    repeat,
    canGoNext,
    canGoPrevious,
    labels,
    onTogglePlay,
    onPlayNext,
    onPlayPrevious,
    onToggleShuffle,
    onToggleRepeat,
  } = useTransportActions();
  const reduceMotion = isReducedMotion();

  return (
    <div className="flex items-center justify-center gap-6 lg:gap-8 w-full py-1.5">
      <motion.button
        type="button"
        whileTap={reduceMotion ? undefined : { scale: 0.92 }}
        onClick={onToggleShuffle}
        className={toggleBtn(shuffle)}
        aria-label={labels.shuffle}
        aria-pressed={shuffle}
      >
        <Shuffle className="w-[18px] h-[18px]" strokeWidth={2} />
        {shuffle ? <ActiveDot /> : null}
      </motion.button>

      <motion.button
        type="button"
        whileTap={reduceMotion || !canGoPrevious ? undefined : { scale: 0.92 }}
        onClick={onPlayPrevious}
        disabled={!canGoPrevious}
        className={skipBtn(!canGoPrevious)}
        aria-label={labels.previous}
      >
        <SkipBack className="w-6 h-6 fill-current" />
      </motion.button>

      <motion.button
        type="button"
        onClick={onTogglePlay}
        className={cn(
          'btn-juicy relative w-[68px] h-[68px] rounded-full text-track-fg flex items-center justify-center ring-1 ring-white/25 focus-ring',
          isPlaying && 'pulse-glow',
        )}
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 22%, hsl(var(--ink-primary) / 0.26), transparent 55%), linear-gradient(135deg, hsl(var(--track-accent)), hsl(var(--track-accent-strong)))',
          boxShadow:
            '0 10px 30px -6px hsl(var(--track-accent) / 0.55), 0 0 0 1px hsl(var(--track-accent) / 0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
        }}
        aria-label={labels.play}
        aria-pressed={isPlaying}
      >
        {isPlaying ? <span aria-hidden="true" className="np-main-play-ring" /> : null}
        {isPlaying ? (
          <Pause className="relative z-10 w-7 h-7 fill-current" />
        ) : (
          <Play className="relative z-10 w-7 h-7 fill-current ml-0.5" />
        )}
      </motion.button>

      <motion.button
        type="button"
        whileTap={reduceMotion || !canGoNext ? undefined : { scale: 0.92 }}
        onClick={onPlayNext}
        disabled={!canGoNext}
        className={skipBtn(!canGoNext)}
        aria-label={labels.next}
      >
        <SkipForward className="w-6 h-6 fill-current" />
      </motion.button>

      <motion.button
        type="button"
        whileTap={reduceMotion ? undefined : { scale: 0.92 }}
        onClick={onToggleRepeat}
        className={toggleBtn(repeat !== 'off')}
        aria-label={labels.repeat}
        aria-pressed={repeat !== 'off'}
      >
        {repeat === 'one' ? (
          <span className="relative inline-flex">
            <Repeat1 className="w-[18px] h-[18px]" strokeWidth={2} />
          </span>
        ) : (
          <Repeat className="w-[18px] h-[18px]" strokeWidth={2} />
        )}
        {repeat !== 'off' ? <ActiveDot /> : null}
      </motion.button>
    </div>
  );
};

export default TransportControls;
