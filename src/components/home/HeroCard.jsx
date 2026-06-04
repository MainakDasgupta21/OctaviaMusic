import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import Button from '@/components/ui-v2/Button';
import Skeleton from '@/components/ui-v2/Skeleton';
import SmartImage from '@/components/SmartImage';
import { fadeUp } from '@/design/motion';

// Split the feature title into per-word spans so .kinetic-headline can stagger
// each word in via the --i CSS custom property. Whitespace-only fragments are
// preserved as plain text nodes to keep word breaks visually correct.
const splitWords = (text) => {
  if (typeof text !== 'string' || text.length === 0) return [];
  return text.split(/(\s+)/).filter(Boolean);
};

const HeroCard = ({ feature, issueNum, onPlay, isPlayable }) => {
  const words = useMemo(() => splitWords(feature?.title || ''), [feature?.title]);
  return (
  <motion.section
    {...fadeUp}
    className="relative overflow-hidden rounded-soft ring-1 ring-white/[0.08] shadow-elev-5"
    style={{ minHeight: '460px' }}
  >
    <SmartImage
      src={feature.cover}
      alt={feature.title}
      loading="eager"
      fetchpriority="high"
      rounded="rounded-none"
      className="absolute inset-0 w-full h-full"
      imgClassName="scale-105"
      interactive
    />

    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/82 via-50% to-transparent" />
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent"
    />
    <div
      aria-hidden="true"
      className="absolute -bottom-32 -left-32 w-[480px] h-[480px] rounded-full opacity-50 blur-3xl"
      style={{ background: 'hsl(var(--track-accent) / 0.35)' }}
    />

    <div
      aria-hidden="true"
      className="hidden md:flex absolute top-0 right-0 bottom-0 w-12 flex-col items-center justify-between py-8 border-l border-white/[0.08] bg-background/20 backdrop-blur-[2px]"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-3 [writing-mode:vertical-rl] rotate-180">
        Feature · {issueNum}
      </span>
      <span aria-hidden="true" className="text-ink-4 text-sm">✦</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-4 [writing-mode:vertical-rl] rotate-180">
        Cover Story
      </span>
    </div>

    <div className="relative h-full p-7 md:p-12 md:pr-24 flex flex-col justify-end gap-7 max-w-3xl">
      <div className="flex items-center gap-3">
        <span className="issue-pill">
          <span className="w-1.5 h-1.5 rounded-full bg-track" />
          <span className="text-iris">{feature.eyebrow || 'On Rotation'}</span>
        </span>
        {/* Hairline vertical rule separates the editorial sub-label from
            the issue-pill — magazine-deck rhythm. Only renders when the
            label exists and we're on >= sm so the eyebrow line stays clean
            on mobile. */}
        <span aria-hidden="true" className="hidden sm:inline h-3 w-px bg-ink-4/40" />
        <span className="hidden sm:inline font-editorial text-[13px] text-ink-3">
          {feature.label || 'Daily feature'}
        </span>
      </div>
      <div>
        <h2
          className="kinetic-headline headline-balance font-display text-display-xl text-ink leading-[0.92] mb-4 max-w-2xl"
          aria-label={feature.title}
        >
          {words.map((word, idx) => (
            <span key={`${word}-${idx}`} aria-hidden="true">
              <span style={{ '--i': idx }}>{word}</span>
            </span>
          ))}
        </h2>
        <p className="font-editorial text-ink-2 text-base md:text-lg max-w-lg leading-snug body-pretty">
          {feature.description}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="premium"
          size="lg"
          onClick={onPlay}
          disabled={!isPlayable}
          leftIcon={<Play className="w-5 h-5 fill-current" />}
          className="btn-juicy"
        >
          Play feature
        </Button>
        <Button
          asChild
          variant="editorial"
          size="lg"
        >
          <Link to={feature.to} className="inline-flex items-center gap-2">
            Read more
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  </motion.section>
  );
};

export const HeroSkeleton = () => (
  <div
    className="relative overflow-hidden rounded-soft ring-1 ring-white/[0.08] bg-surface-2/60"
    style={{ minHeight: '460px' }}
  >
    <div className="absolute inset-x-0 bottom-0 p-7 md:p-12 space-y-4">
      <Skeleton variant="iris" className="h-3 w-24" />
      <Skeleton variant="iris" className="h-12 w-2/3" />
      <Skeleton variant="iris" className="h-4 w-1/2" />
    </div>
  </div>
);

export default HeroCard;
