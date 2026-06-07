import { AnimatePresence, motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { buildMasthead, getHeroSubtitle, getHeroTitle, getLiveDataState, getUpdatedAgoLabel } from '@/lib/chartsUtils';
import { cn } from '@/lib/utils';

const subtitleMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.15 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } },
};

const ChartsHero = ({ mode, region, window, lastUpdated }) => {
  const title = getHeroTitle(mode);
  const subtitle = getHeroSubtitle({ mode, region, window });
  const liveState = getLiveDataState(window);
  const updatedLabel = getUpdatedAgoLabel(lastUpdated);

  return (
    <div className="mb-8">
      <div
        aria-hidden="true"
        className="hidden md:flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-ink-4 mb-8 pb-3 border-b border-white/[0.08]"
      >
        <span>{buildMasthead({ mode })}</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }}
        className="grid lg:grid-cols-[1fr_auto] gap-6 items-end"
      >
        <div>
          <p className="eyebrow eyebrow-accent mb-3 flex items-center gap-2">
            <span className="w-6 h-px bg-track" />
            Top 50
          </p>
          <h1 className="font-display text-display-xl text-ink leading-[0.95]">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={mode} {...subtitleMotion} className="inline-flex flex-wrap gap-2 items-baseline">
                <span>{title.lead}</span>
                <span className="font-editorial text-accent not-italic">{title.accent}</span>
              </motion.span>
            </AnimatePresence>
          </h1>
          <div className="min-h-[2.75rem] mt-4">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={`${mode}-${region}-${window}`}
                {...subtitleMotion}
                className="font-editorial text-[15px] text-ink-3 max-w-2xl leading-snug"
              >
                {subtitle}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <div className="inline-flex items-center gap-3 self-start lg:self-end">
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-mono uppercase tracking-[0.2em]',
                  liveState.isDisabled
                    ? 'border-white/10 text-ink-4'
                    : 'border-emerald-400/30 text-emerald-300',
                )}
              >
                <span
                  className={cn(
                    'inline-block w-2 h-2 rounded-full',
                    liveState.dotClassName,
                  )}
                  aria-hidden="true"
                />
                Live data
              </div>
            </TooltipTrigger>
            <TooltipContent>{liveState.tooltip}</TooltipContent>
          </Tooltip>
          {updatedLabel ? (
            <span className="text-[11px] text-ink-4">{updatedLabel}</span>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
};

export default ChartsHero;
