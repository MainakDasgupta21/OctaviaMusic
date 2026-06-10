import { useEffect, useRef } from 'react';
import { PartyPopper, Sparkles, X } from 'lucide-react';
import Button from '@/components/ui-v2/Button';

const LoopCompleteModal = ({
  open = false,
  win = null,
  onClose,
}) => {
  const continueButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleEsc = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => continueButtonRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open || !win) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/65 backdrop-blur-sm p-4 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Discovery reward unlocked"
      onClick={() => onClose?.()}
    >
      <div
        className="w-full max-w-lg rounded-soft border border-white/[0.12] bg-surface-1 p-6 relative"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close reward modal"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full border border-white/15 text-ink-3 hover:text-ink hover:border-white/25"
        >
          <X className="w-4 h-4" />
        </button>

        <p className="eyebrow eyebrow-accent inline-flex items-center gap-2 mb-2">
          <PartyPopper className="w-3.5 h-3.5" />
          Loop complete
        </p>
        <h3 className="font-display text-3xl text-ink leading-tight">{win.title}</h3>
        <p className="font-editorial text-[14px] text-ink-3 mt-2">
          You completed today&rsquo;s mission and earned a reward.
        </p>

        <div className="mt-5 rounded-sharp border border-emerald-400/30 bg-emerald-500/10 p-4">
          <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-emerald-300">
            Reward unlocked
          </p>
          <p className="font-display text-4xl text-ink mt-1">+{win.rewardXp} XP</p>
          <p className="text-[12px] text-ink-3 mt-1 inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            Keep your streak alive tomorrow for bigger rewards.
          </p>
        </div>

        <div className="mt-6 flex justify-end">
          <Button ref={continueButtonRef} type="button" size="sm" onClick={onClose}>
            Continue exploring
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LoopCompleteModal;
