import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Shuffle, Sparkles } from 'lucide-react';
import Button from '@/components/ui-v2/Button';
import Skeleton from '@/components/ui-v2/Skeleton';
import { shuffleArray } from '@/lib/shuffle';
import { pickRandomItem } from '@/lib/surprise-random';
import { fadeUp, staggerChildren } from '@/design/motion';
import { EXPLORE_MOODS } from '@/lib/explore-recommendations';
import { cn } from '@/lib/utils';

const HOME_MOODS = EXPLORE_MOODS.map((mood) => ({
  id: mood.id,
  label: mood.chipLabel || mood.label,
  gradient: mood.chipGradient,
}));

const DiscoverRibbon = ({
  trending = [],
  onPlayTrack,
  onPlayTracks,
  onSurprise,
  surpriseLoading = false,
  isLoading = false,
}) => {
  const hasTrending = Array.isArray(trending) && trending.length > 0;
  const canSurprise =
    typeof onSurprise === 'function'
    || (hasTrending && typeof onPlayTrack === 'function');

  const playDiscoverMix = () => {
    if (!hasTrending || typeof onPlayTracks !== 'function') return;
    const shuffled = shuffleArray(trending);
    onPlayTracks(shuffled, { replaceQueue: true, forceSequential: false });
  };

  const surpriseMe = () => {
    if (typeof onSurprise === 'function') {
      onSurprise();
      return;
    }
    if (!hasTrending || typeof onPlayTrack !== 'function') return;
    const pick = pickRandomItem(trending);
    if (pick) onPlayTrack(pick);
  };

  return (
    <motion.section
      {...fadeUp}
      aria-labelledby="home-discover"
      className="mb-10 md:mb-14 rounded-soft border border-white/[0.08] bg-surface-2/40 backdrop-blur-md p-6 md:p-8"
      style={{
        background:
          'radial-gradient(ellipse 60% 80% at 0% 0%, hsl(var(--track-accent) / 0.18), transparent 60%), radial-gradient(ellipse 50% 60% at 100% 100%, hsl(var(--track-accent-3) / 0.18), transparent 60%), hsl(var(--surface-2) / 0.55)',
      }}
    >
      <div className="grid md:grid-cols-[1fr_auto] gap-6 md:gap-10 items-start md:items-center">
        <div className="min-w-0">
          <p className="eyebrow eyebrow-accent mb-2 inline-flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            Start listening
          </p>
          <h2
            id="home-discover"
            className="font-display text-2xl md:text-[32px] text-ink leading-[1.05] headline-balance"
          >
            New here? <span className="font-editorial text-track">Tap and the music plays.</span>
          </h2>
          <p className="font-editorial text-[13.5px] text-ink-3 mt-2 max-w-md leading-snug body-pretty">
            Skip the search bar — start a shuffled mix, roll the dice, or pick a mood.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isLoading && !hasTrending ? (
            <>
              <Skeleton className="h-12 w-44 rounded-full" />
              <Skeleton className="h-12 w-36 rounded-full" />
            </>
          ) : (
            <>
              <Button
                variant="premium"
                size="lg"
                onClick={playDiscoverMix}
                disabled={!hasTrending}
                leftIcon={<Shuffle className="w-4 h-4" />}
              >
                Play Discover Mix
              </Button>
              <Button
                variant="glass"
                size="lg"
                onClick={surpriseMe}
                loading={surpriseLoading}
                disabled={!canSurprise}
                leftIcon={<Play className="w-4 h-4 fill-current" />}
              >
                Surprise me
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-white/[0.06]">
        <p className="eyebrow text-ink-3 mb-3">Or pick a mood</p>
        <motion.div
          variants={staggerChildren(0.03)}
          initial="initial"
          animate="animate"
          className="flex flex-wrap gap-2"
        >
          {HOME_MOODS.map((mood) => (
            <motion.div variants={fadeUp} key={mood.id}>
              <Link
                to={`/explore?mood=${mood.id}`}
                className={cn(
                  'relative inline-flex items-center px-4 py-2 rounded-sharp text-[13px] font-medium text-white overflow-hidden focus-ring transition-transform hover:-translate-y-0.5',
                  'border border-white/15',
                )}
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-0 bg-gradient-to-br ${mood.gradient}`}
                />
                <span className="relative z-10">{mood.label}</span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
};

export default DiscoverRibbon;
