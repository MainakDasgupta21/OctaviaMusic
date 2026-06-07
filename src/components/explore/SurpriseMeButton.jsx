import { Dice5, Sparkles } from 'lucide-react';
import Button from '@/components/ui-v2/Button';

const SurpriseMeButton = ({
  onSurprise,
  disabled = false,
  isLoading = false,
  lastPickedTitle = '',
}) => (
  <div
    className="rounded-soft border border-white/[0.08] p-5 md:p-7 mb-12"
    style={{
      background:
        'radial-gradient(ellipse 50% 80% at 20% 0%, hsl(var(--track-accent) / 0.26), transparent 60%), radial-gradient(ellipse 45% 65% at 100% 100%, hsl(var(--iris) / 0.22), transparent 65%), hsl(var(--surface-2) / 0.58)',
    }}
  >
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div className="min-w-0">
        <p className="eyebrow eyebrow-accent mb-2 inline-flex items-center gap-2">
          <Sparkles className="w-3 h-3" />
          Serendipity machine
        </p>
        <h2 className="font-display text-2xl md:text-[34px] text-ink leading-[1.03]">
          One button. One brand-new obsession.
        </h2>
        <p className="font-editorial text-[13.5px] text-ink-3 mt-2 max-w-2xl leading-snug">
          Every tap launches a random but taste-matched song you probably have not heard yet.
        </p>
        {lastPickedTitle ? (
          <p className="mt-2 text-[12px] font-mono uppercase tracking-[0.16em] text-ink-4 truncate">
            Last drop: {lastPickedTitle}
          </p>
        ) : null}
      </div>
      <Button
        variant="premium"
        size="lg"
        disabled={disabled}
        loading={isLoading}
        onClick={onSurprise}
        leftIcon={<Dice5 className="w-4 h-4" />}
        className="min-w-[210px]"
      >
        Surprise Me
      </Button>
    </div>
  </div>
);

export default SurpriseMeButton;
