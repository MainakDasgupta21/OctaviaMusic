import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import SectionHeader from '@/components/ui-v2/SectionHeader';
import { fadeUp, staggerChildren } from '@/design/motion';
import { cn } from '@/lib/utils';

const CuratedJourneys = ({
  journeys = [],
  onPlayJourney,
}) => (
  <section className="mb-14">
    <SectionHeader
      ordinal={5}
      eyebrow="Guided routes"
      title="Discovery journeys"
      subtitle="Editorial routes built to feel hand-curated, emotional, and cinematic."
    />
    <motion.div
      variants={staggerChildren(0.05)}
      initial="initial"
      animate="animate"
      className="grid md:grid-cols-3 gap-3.5"
    >
      {journeys.map((journey, index) => (
        <motion.button
          variants={fadeUp}
          key={journey.id}
          type="button"
          onClick={() => onPlayJourney?.(journey)}
          className={cn(
            'relative rounded-sharp p-5 border border-white/[0.08] hover:border-white/22 transition-colors text-left focus-ring overflow-hidden group',
            'bg-surface-2/45',
          )}
        >
          <span
            aria-hidden="true"
            className={cn('absolute inset-0 opacity-85 bg-gradient-to-br', journey.gradient)}
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
          <div className="relative">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/70 mb-3">
              Journey №{String(index + 1).padStart(2, '0')}
            </p>
            <h3 className="font-display text-[24px] leading-tight text-white max-w-[18ch]">
              {journey.title}
            </h3>
            <p className="font-editorial text-[13px] text-white/70 mt-2 leading-snug">
              {journey.blurb}
            </p>
            <span className="mt-4 inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.17em] text-white/80">
              <Play className="w-3.5 h-3.5 fill-current" />
              Start journey
            </span>
          </div>
        </motion.button>
      ))}
    </motion.div>
  </section>
);

export default CuratedJourneys;
