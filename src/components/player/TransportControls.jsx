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
    'touch-target inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.02] transition-[background-color,color,border-color,transform] duration-short ease-emphasis focus-ring',
    disabled
      ? 'cursor-not-allowed text-ink-4 opacity-70'
      : 'text-ink-2 hover:border-white/[0.14] hover:bg-white/[0.08] hover:text-ink active:scale-95',
  );

const toggleBtn = (active) =>
  cn(
    'touch-target relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-[background-color,color] duration-short ease-emphasis focus-ring',
    active
      ? 'bg-track/[0.12] text-accent ring-1 ring-track/35'
      : 'text-ink-3 hover:bg-white/[0.05] hover:text-ink',
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
    <div className="flex w-full items-center justify-center gap-2 py-1 sm:gap-2.5">
      <motion.button
        type="button"
        whileTap={reduceMotion ? undefined : { scale: 0.92 }}
        onClick={onToggleShuffle}
        className={toggleBtn(shuffle)}
        aria-label={labels.shuffle}
        aria-pressed={shuffle}
      >
        <Shuffle className="h-[17px] w-[17px]" strokeWidth={2} />
      </motion.button>

      <motion.button
        type="button"
        whileTap={reduceMotion || !canGoPrevious ? undefined : { scale: 0.92 }}
        onClick={onPlayPrevious}
        disabled={!canGoPrevious}
        className={skipBtn(!canGoPrevious)}
        aria-label={labels.previous}
      >
        <SkipBack className="h-[21px] w-[21px] fill-current" />
      </motion.button>

      <motion.button
        type="button"
        whileHover={reduceMotion ? undefined : { scale: 1.02 }}
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        onClick={onTogglePlay}
        className={cn(
          'relative flex h-[60px] w-[60px] items-center justify-center rounded-full text-track-fg ring-1 ring-white/20 focus-ring transition-transform duration-short ease-emphasis',
        )}
        style={{
          backgroundImage:
            'radial-gradient(circle at 30% 22%, hsl(var(--ink-primary) / 0.22), transparent 56%), linear-gradient(135deg, hsl(var(--track-accent)), hsl(var(--track-accent-strong)))',
          boxShadow:
            '0 12px 30px -10px hsl(var(--track-accent) / 0.6), 0 0 0 1px hsl(var(--track-accent) / 0.32), inset 0 1px 0 rgba(255,255,255,0.22)',
        }}
        aria-label={labels.play}
        aria-pressed={isPlaying}
      >
        {isPlaying ? (
          <Pause className="h-6 w-6 fill-current" />
        ) : (
          <Play className="ml-0.5 h-6 w-6 fill-current" />
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
        <SkipForward className="h-[21px] w-[21px] fill-current" />
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
            <Repeat1 className="h-[17px] w-[17px]" strokeWidth={2} />
          </span>
        ) : (
          <Repeat className="h-[17px] w-[17px]" strokeWidth={2} />
        )}
      </motion.button>
    </div>
  );
};

export default TransportControls;
