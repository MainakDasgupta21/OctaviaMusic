import {
  Coffee,
  Flame,
  Headphones,
  Moon,
  Play,
  Sparkles,
  Sun,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeUp, staggerChildren } from '@/design/motion';
import { cn } from '@/lib/utils';

const MOOD_ICONS = {
  focus: Sparkles,
  morning: Sun,
  evening: Moon,
  workout: Flame,
  lounge: Headphones,
  cafe: Coffee,
};

const MoodBoard = ({
  moods = [],
  activeMoodId = null,
  onMoodSelect,
  disabled = false,
  onDisabledSelect,
}) => (
  <motion.div
    variants={staggerChildren(0.04)}
    initial="initial"
    animate="animate"
    className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
  >
    {moods.map((mood, index) => {
      const MoodIcon = MOOD_ICONS[mood.id] || Sparkles;
      const isActive = activeMoodId === mood.id;
      return (
        <motion.button
          variants={fadeUp}
          key={mood.id}
          type="button"
          aria-label={`Set mood ${mood.label}`}
          aria-pressed={isActive}
          aria-disabled={disabled}
          onClick={() => {
            if (disabled) {
              onDisabledSelect?.();
              return;
            }
            onMoodSelect?.(mood);
          }}
          className={cn(
            'relative aspect-[5/3] rounded-sharp overflow-hidden text-left p-4 focus-ring border border-white/[0.08] transition-colors group',
            !disabled && 'hover:border-white/25',
            disabled && 'cursor-wait opacity-70',
            isActive && 'border-track/60 ring-1 ring-track/40',
          )}
          style={{ background: 'hsl(var(--surface-2))' }}
        >
          <div className={cn('absolute inset-0 bg-gradient-to-br', mood.mix)} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 font-editorial italic text-[84px] sm:text-[96px] lg:text-[110px] leading-none text-white/[0.06] group-hover:text-white/10 transition-colors select-none"
            style={{ fontFeatureSettings: '"opsz" 144' }}
          >
            {mood.dropCap}
          </span>
          <span className="absolute top-3 right-3 w-9 h-9 rounded-full bg-track text-track-fg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-accent">
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          </span>
          <div className="relative h-full flex flex-col justify-between">
            <MoodIcon className="w-5 h-5 text-white/85" strokeWidth={1.75} />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/55 mb-1">
                Mood №{String(index + 1).padStart(2, '0')}
              </p>
              <p className="font-display text-xl text-white">{mood.label}</p>
            </div>
          </div>
        </motion.button>
      );
    })}
  </motion.div>
);

export default MoodBoard;
