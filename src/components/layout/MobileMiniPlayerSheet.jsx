import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import {
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  ListMusic,
  Maximize2,
  X,
} from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useUI } from '@/contexts/UIContext';
import { useTransportActions } from '@/hooks/use-transport-actions';
import { cn } from '@/lib/utils';

// =============================================================================
// MobileMiniPlayerSheet
// -----------------------------------------------------------------------------
// Long-press / swipe-up sheet for the mobile mini player. Brings desktop-only
// transport controls (shuffle, repeat, volume) plus a queue shortcut to mobile
// without leaving the current page. Tapping the artwork still opens the full
// expanded player; this sheet is for quick adjustments.
// =============================================================================

const MobileMiniPlayerSheet = ({ open, onClose }) => {
  const {
    volume,
    isMuted,
    setVolume,
    toggleMute,
    shuffle,
    repeat,
    queue,
  } = usePlayer();
  const { onToggleShuffle, onToggleRepeat, labels } = useTransportActions();
  const { openExpandedPlayer } = useUI();

  // Close on Escape so keyboard users can dismiss without reaching for the
  // overlay. The sheet keeps focus trapped inside while open via `tabIndex`
  // on the dialog node.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="mobile-mini-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="md:hidden fixed inset-0 z-[60] bg-bg/70 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            key="mobile-mini-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Quick actions"
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className="md:hidden fixed inset-x-2 bottom-2 z-[61] rounded-soft glass-strong ring-1 ring-white/[0.08] overflow-hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex items-center justify-between px-5 pt-4">
              <span className="eyebrow text-ink-3">Quick actions</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close quick actions"
                className="p-1.5 rounded-full text-ink-3 hover:text-ink hover:bg-white/[0.06] focus-ring"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onToggleShuffle}
                  className={cn(
                    'h-12 rounded-sharp ring-1 ring-white/[0.08] inline-flex items-center justify-center gap-2 text-[13px] font-medium focus-ring transition-colors',
                    shuffle
                      ? 'bg-track/15 text-accent ring-track/40'
                      : 'bg-white/[0.04] text-ink-2 hover:text-ink',
                  )}
                  aria-pressed={shuffle}
                  aria-label={labels.shuffle}
                >
                  <Shuffle className="w-4 h-4" />
                  Shuffle
                </button>
                <button
                  type="button"
                  onClick={onToggleRepeat}
                  className={cn(
                    'h-12 rounded-sharp ring-1 ring-white/[0.08] inline-flex items-center justify-center gap-2 text-[13px] font-medium focus-ring transition-colors',
                    repeat !== 'off'
                      ? 'bg-track/15 text-accent ring-track/40'
                      : 'bg-white/[0.04] text-ink-2 hover:text-ink',
                  )}
                  aria-pressed={repeat !== 'off'}
                  aria-label={labels.repeat}
                >
                  {repeat === 'one' ? (
                    <Repeat1 className="w-4 h-4" />
                  ) : (
                    <Repeat className="w-4 h-4" />
                  )}
                  {repeat === 'one' ? 'Repeat 1' : repeat === 'all' ? 'Repeat all' : 'Repeat off'}
                </button>
              </div>

              <div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-2 rounded-full text-ink-2 hover:text-ink hover:bg-white/[0.06] focus-ring"
                    aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <Slider
                    value={[Math.round(volume * 100)]}
                    max={100}
                    step={1}
                    onValueChange={(value) => setVolume(value[0] / 100)}
                    aria-label="Volume"
                    className="flex-1"
                  />
                  <span className="text-[10.5px] font-mono text-ink-4 w-8 text-right tabular tracking-tight">
                    {Math.round(volume * 100)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose?.();
                    openExpandedPlayer();
                  }}
                  className="h-11 rounded-sharp bg-white/[0.04] ring-1 ring-white/[0.08] text-ink-2 hover:text-ink inline-flex items-center justify-center gap-2 text-[13px] font-medium focus-ring transition-colors"
                >
                  <ListMusic className="w-4 h-4" />
                  Queue
                  <span className="text-ink-4 text-[11px] font-mono">
                    {queue?.length || 0}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose?.();
                    openExpandedPlayer();
                  }}
                  className="h-11 rounded-sharp bg-white/[0.04] ring-1 ring-white/[0.08] text-ink-2 hover:text-ink inline-flex items-center justify-center gap-2 text-[13px] font-medium focus-ring transition-colors"
                >
                  <Maximize2 className="w-4 h-4" />
                  Open player
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
};

export default MobileMiniPlayerSheet;
