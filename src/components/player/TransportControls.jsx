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
import { usePlayer, usePlayerProgress } from '@/contexts/PlayerContext';
import { useSounds } from '@/contexts/SoundContext';
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
    togglePlay,
    playNext,
    playPrevious,
    canGoNext,
    shuffle,
    toggleShuffle,
    repeat,
    toggleRepeat,
  } = usePlayer();
  const { canGoPrevious } = usePlayerProgress();
  const reduceMotion = isReducedMotion();
  const { play: playSfx } = useSounds();

  const handleTogglePlay = () => {
    playSfx('pop');
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(8); } catch { /* noop */ }
    }
    togglePlay();
  };
  const handleNext = () => { if (canGoNext) playSfx('click'); playNext(); };
  const handlePrev = () => { if (canGoPrevious) playSfx('click'); playPrevious(); };
  const handleShuffle = () => { playSfx('tick'); toggleShuffle(); };
  const handleRepeat = () => { playSfx('tick'); toggleRepeat(); };

  return (
    <div className="flex items-center justify-center gap-6 lg:gap-8 w-full py-1.5">
      <motion.button
        type="button"
        whileTap={reduceMotion ? undefined : { scale: 0.92 }}
        onClick={handleShuffle}
        className={toggleBtn(shuffle)}
        aria-label="Toggle shuffle"
        aria-pressed={shuffle}
      >
        <Shuffle className="w-[18px] h-[18px]" strokeWidth={2} />
        {shuffle ? <ActiveDot /> : null}
      </motion.button>

      <motion.button
        type="button"
        whileTap={reduceMotion || !canGoPrevious ? undefined : { scale: 0.92 }}
        onClick={handlePrev}
        disabled={!canGoPrevious}
        className={skipBtn(!canGoPrevious)}
        aria-label="Previous track"
      >
        <SkipBack className="w-6 h-6 fill-current" />
      </motion.button>

      <motion.button
        type="button"
        onClick={handleTogglePlay}
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
        aria-label={isPlaying ? 'Pause' : 'Play'}
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
        onClick={handleNext}
        disabled={!canGoNext}
        className={skipBtn(!canGoNext)}
        aria-label="Next track"
      >
        <SkipForward className="w-6 h-6 fill-current" />
      </motion.button>

      <motion.button
        type="button"
        whileTap={reduceMotion ? undefined : { scale: 0.92 }}
        onClick={handleRepeat}
        className={toggleBtn(repeat !== 'off')}
        aria-label={
          repeat === 'one' ? 'Repeat one' : repeat === 'all' ? 'Repeat all' : 'Repeat off'
        }
        aria-pressed={repeat !== 'off'}
      >
        {repeat === 'one' ? (
          <Repeat1 className="w-[18px] h-[18px]" strokeWidth={2} />
        ) : (
          <Repeat className="w-[18px] h-[18px]" strokeWidth={2} />
        )}
        {repeat !== 'off' ? <ActiveDot /> : null}
      </motion.button>
    </div>
  );
};

export default TransportControls;
