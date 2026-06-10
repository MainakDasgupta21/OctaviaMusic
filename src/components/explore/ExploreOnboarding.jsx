import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Sparkles } from 'lucide-react';
import Button from '@/components/ui-v2/Button';
import { EXPLORE_ONBOARDING_STEPS } from '@/lib/explore-onboarding';
import { cn } from '@/lib/utils';

const stepBadge = (value, fromIndex = true) => `0${fromIndex ? value + 1 : value}`.slice(-2);

const ExploreOnboarding = ({
  open = false,
  onComplete,
  onSkip,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({
    moodId: null,
    energyId: null,
    activityId: null,
  });
  const continueButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setAnswers({
      moodId: null,
      energyId: null,
      activityId: null,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => continueButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, stepIndex]);

  const step = EXPLORE_ONBOARDING_STEPS[stepIndex] || EXPLORE_ONBOARDING_STEPS[0];
  const selected = answers[step.id];
  const isFinalStep = stepIndex === EXPLORE_ONBOARDING_STEPS.length - 1;

  const canContinue = useMemo(
    () => Boolean(selected),
    [selected],
  );

  const handleOptionSelect = (optionId) => {
    setAnswers((prev) => ({ ...prev, [step.id]: optionId }));
  };

  const handleContinue = () => {
    if (!canContinue) return;
    if (isFinalStep) {
      onComplete?.(answers);
      return;
    }
    setStepIndex((prev) => Math.min(prev + 1, EXPLORE_ONBOARDING_STEPS.length - 1));
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="explore-onboarding"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] p-4 md:p-8"
        role="dialog"
        aria-modal="true"
        aria-label="Explore onboarding"
        onClick={() => onSkip?.()}
      >
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative max-w-3xl mx-auto mt-[6vh] rounded-soft border border-white/10 bg-surface-2/80 backdrop-blur-xl p-5 md:p-8 shadow-elev-3"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-ink-3">
              <Sparkles className="w-3.5 h-3.5 text-track" />
              Discovery game
            </div>
            <button
              type="button"
              onClick={onSkip}
              className="text-[11px] font-mono uppercase tracking-[0.15em] text-ink-4 hover:text-ink-2 transition-colors"
            >
              Skip for now
            </button>
          </div>

          <div className="mb-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4 mb-2">
              Step {stepBadge(stepIndex)} / {stepBadge(EXPLORE_ONBOARDING_STEPS.length, false)}
            </p>
            <h2 className="font-display text-2xl md:text-4xl text-ink leading-tight">
              {step.title}
            </h2>
            <p className="font-editorial text-[14px] text-ink-3 mt-2">{step.subtitle}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-7">
            {(step.options || []).map((option) => {
              const isActive = selected === option.id;
              return (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  className={cn(
                    'relative rounded-sharp p-4 text-left border transition-colors focus-ring',
                    'bg-surface-1/60 hover:bg-surface-1/90 border-white/[0.08] hover:border-white/20',
                    isActive && 'border-track/70 ring-1 ring-track/40',
                  )}
                >
                  {option.gradient ? (
                    <span
                      aria-hidden="true"
                      className={cn('absolute inset-0 opacity-75 bg-gradient-to-br rounded-sharp', option.gradient)}
                    />
                  ) : null}
                  <span className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent rounded-sharp" />
                  <span className="relative z-10 block">
                    <span className="font-display text-xl text-white">{option.label}</span>
                    {option.hint ? (
                      <span className="block text-[12px] text-white/72 mt-1">{option.hint}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="glass"
              onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
              disabled={stepIndex === 0}
            >
              Back
            </Button>
            <Button
              ref={continueButtonRef}
              variant="premium"
              onClick={handleContinue}
              disabled={!canContinue}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              {isFinalStep ? 'Start discovering' : 'Next'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ExploreOnboarding;
