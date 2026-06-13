import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import {
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  ListMusic,
  Plus,
  Check,
  X,
} from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useTransportActions } from '@/hooks/use-transport-actions';
import usePlaylistActions from '@/hooks/use-playlist-actions';
import { durations, isReducedMotion, springs } from '@/design/motion';
import { cn } from '@/lib/utils';

// =============================================================================
// MobileMiniPlayerSheet
// -----------------------------------------------------------------------------
// Long-press / swipe-up sheet for the mobile mini player. Brings desktop-only
// transport controls (shuffle, repeat, volume) plus a quick route to the
// `/player` page. This sheet is for lightweight adjustments.
// =============================================================================

const MobileMiniPlayerSheet = ({ open, onClose }) => {
  const {
    currentTrack,
    volume,
    isMuted,
    setVolume,
    toggleMute,
    shuffle,
    repeat,
    queue,
  } = usePlayer();
  const {
    playlists,
    isTrackInPlaylist,
    addTrackToPlaylistWithFeedback,
    createPlaylistFromTrack,
  } = usePlaylistActions();
  const { onToggleShuffle, onToggleRepeat, labels } = useTransportActions();
  const navigate = useNavigate();
  const reduceMotion = isReducedMotion();

  const handleCreatePlaylist = () => {
    const createdId = createPlaylistFromTrack({
      track: currentTrack,
      navigateTo: true,
    });
    if (createdId) onClose?.();
  };

  const handleAddToPlaylist = (playlist) => {
    const result = addTrackToPlaylistWithFeedback({ playlist, track: currentTrack });
    if (result.status !== 'invalid') {
      onClose?.();
    }
  };

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
            transition={{ duration: reduceMotion ? 0 : durations.short }}
            onClick={onClose}
            className="phablet:hidden fixed inset-0 z-[60] bg-bg/75 backdrop-blur-sm"
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
            transition={reduceMotion ? { duration: 0 } : springs.overlay}
            className="phablet:hidden fixed inset-x-2 bottom-[calc(var(--mobile-nav-offset)+env(safe-area-inset-bottom,0px))] z-[61] flex max-h-[min(82dvh,560px)] flex-col rounded-soft glass-strong ring-1 ring-white/[0.08] overflow-hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex justify-center pt-2">
              <span aria-hidden="true" className="h-1 w-10 rounded-full bg-white/[0.16]" />
            </div>
            <div className="flex items-center justify-between px-4 pt-4 sm:px-5">
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

            <div className="custom-scrollbar flex-1 overflow-y-auto px-4 py-4 space-y-5 sm:px-5">
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onToggleShuffle}
                  className={cn(
                    'touch-target h-12 rounded-sharp ring-1 ring-white/[0.08] inline-flex items-center justify-center gap-2 text-[13px] font-medium focus-ring transition-colors',
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
                    'touch-target h-12 rounded-sharp ring-1 ring-white/[0.08] inline-flex items-center justify-center gap-2 text-[13px] font-medium focus-ring transition-colors',
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
                    className="touch-target p-2 rounded-full text-ink-2 hover:text-ink hover:bg-white/[0.06] focus-ring"
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

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-ink-4">
                    Add to playlist
                  </p>
                  <button
                    type="button"
                    onClick={handleCreatePlaylist}
                    className="h-8 px-2.5 rounded-sharp bg-white/[0.04] ring-1 ring-white/[0.08] text-ink-2 hover:text-ink inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.12em] focus-ring transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New
                  </button>
                </div>
                <div className="max-h-[130px] overflow-y-auto custom-scrollbar rounded-sharp border border-white/[0.08] bg-white/[0.02] p-1.5 space-y-1">
                  {playlists.length > 0 ? (
                    playlists.map((playlist) => {
                      const alreadyAdded = isTrackInPlaylist(playlist, currentTrack);
                      return (
                        <button
                          key={playlist.id}
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => handleAddToPlaylist(playlist)}
                          className={cn(
                            'w-full flex items-center justify-between gap-2 rounded-sharp px-2 py-2 text-left text-[12.5px] transition-colors focus-ring',
                            alreadyAdded
                              ? 'cursor-default text-ink-4/85 bg-white/[0.02]'
                              : 'text-ink-2 hover:text-ink hover:bg-white/[0.06]',
                          )}
                        >
                          <span className="truncate">{playlist.name}</span>
                          {alreadyAdded ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.12em] text-track">
                              <Check className="w-3 h-3" />
                              Added
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-ink-4">
                              Add
                            </span>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <p className="px-2 py-2 text-[12px] text-ink-4">
                      No playlists yet. Create one first.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose?.();
                    navigate('/player');
                  }}
                  className="h-11 rounded-sharp bg-white/[0.04] ring-1 ring-white/[0.08] text-ink-2 hover:text-ink inline-flex items-center justify-center gap-2 text-[13px] font-medium focus-ring transition-colors"
                >
                  Open player
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose?.();
                    navigate('/player?panel=queue');
                  }}
                  className="h-11 rounded-sharp bg-white/[0.04] ring-1 ring-white/[0.08] text-ink-2 hover:text-ink inline-flex items-center justify-center gap-2 text-[13px] font-medium focus-ring transition-colors"
                >
                  <ListMusic className="w-4 h-4" />
                  Queue
                  <span className="text-ink-4 text-[11px] font-mono">
                    {queue?.length || 0}
                  </span>
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
