import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  ExternalLink,
  Volume2,
  VolumeX,
  ListMusic,
  Mic2,
  Sparkles,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { usePlayer, usePlayerProgress } from '@/contexts/PlayerContext';
import { useUI } from '@/contexts/UIContext';
import HeartButton from '@/components/HeartButton';
import LyricsPanel from '@/components/player/LyricsPanel';
import QueuePanel from '@/components/player/QueuePanel';
import Tabs from '@/components/ui-v2/Tabs';
import { useColorExtraction } from '@/hooks/use-color-extraction';
import { useTilt } from '@/hooks/use-tilt';
import { fadeUp, isReducedMotion, staggerChildren } from '@/design/motion';
import { cn } from '@/lib/utils';

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const PANELS = [
  { id: 'queue', label: 'Up next', icon: ListMusic },
  { id: 'lyrics', label: 'Lyrics', icon: Mic2 },
  { id: 'related', label: 'Related', icon: Sparkles },
];

const formatIssueNo = (track) => {
  if (!track) return '01';
  const source = `${track.id || ''}:${track.title || ''}:${track.artist || ''}`;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) | 0;
  }
  return String((Math.abs(hash) % 90) + 10).padStart(2, '0');
};

const RelatedPanel = () => {
  const { history, currentTrack, playTrack } = usePlayer();
  const related = history
    .filter((t) => t.id !== currentTrack?.id && t.artist === currentTrack?.artist)
    .slice(0, 8);
  const fallback = history.filter((t) => t.id !== currentTrack?.id).slice(0, 8);
  const list = related.length > 0 ? related : fallback;
  if (list.length === 0) {
    return (
      <p className="text-sm text-ink-3 px-2 mt-6">
        Play a few more tracks to unlock related suggestions.
      </p>
    );
  }
  return (
    <ul className="space-y-1">
      {list.map((t) => (
        <li key={t.id}>
          <button
            type="button"
            onClick={() => playTrack(t)}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 text-left focus-ring"
          >
            <img src={t.thumbnail} alt="" className="w-10 h-10 rounded object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-ink">{t.title}</p>
              <p className="text-xs text-ink-3 truncate">{t.artist}</p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
};

const ExpandedPlayer = () => {
  const navigate = useNavigate();
  const { expandedPlayerOpen, closeExpandedPlayer } = useUI();
  const [panel, setPanel] = useState('queue');
  const [scrubPreview, setScrubPreview] = useState(null);
  const scrubberRef = useRef(null);
  const reduceMotion = isReducedMotion();
  const {
    currentTrack,
    queue,
    isPlaying,
    volume,
    isMuted,
    togglePlay,
    seekTo,
    playNext,
    playPrevious,
    canGoNext,
    shuffle,
    toggleShuffle,
    repeat,
    toggleRepeat,
    setVolume,
    toggleMute,
  } = usePlayer();
  const { progress, duration, canGoPrevious } = usePlayerProgress();
  const { ref: tiltRef, handlers: tiltHandlers } = useTilt({ max: 6, scale: 1.01 });
  const bodyStagger = useMemo(() => staggerChildren(0.08, 0.03), []);

  useColorExtraction(expandedPlayerOpen ? currentTrack?.thumbnail : null);

  useEffect(() => {
    if (!expandedPlayerOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeExpandedPlayer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedPlayerOpen, closeExpandedPlayer]);

  const handleOpenFull = () => {
    closeExpandedPlayer();
    navigate('/player');
  };

  const panelItems = useMemo(
    () =>
      PANELS.map((item) =>
        item.id === 'queue'
          ? { ...item, count: queue.length }
          : item,
      ),
    [queue.length],
  );

  const issueNo = useMemo(
    () => formatIssueNo(currentTrack),
    [currentTrack?.id, currentTrack?.title, currentTrack?.artist],
  );
  const playbackDuration = currentTrack?.duration || formatTime(duration);

  const updateScrubPreview = (clientX) => {
    if (!duration || !Number.isFinite(duration) || !scrubberRef.current) return;
    const rect = scrubberRef.current.getBoundingClientRect();
    if (!rect.width) return;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setScrubPreview(ratio * duration);
  };

  const showScrubPreview = Number.isFinite(scrubPreview) && Number.isFinite(duration) && duration > 0;
  const scrubPreviewPct = showScrubPreview
    ? Math.min(98, Math.max(2, (scrubPreview / duration) * 100))
    : 0;

  return (
    <AnimatePresence>
      {expandedPlayerOpen && currentTrack && (
        <motion.div
          key="expanded-player"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex"
          role="dialog"
          aria-modal="true"
          aria-label="Now playing"
        >
          {/* Backdrop */}
          <button
            type="button"
            onClick={closeExpandedPlayer}
            aria-label="Close now playing"
            className="absolute inset-0 bg-black/75 backdrop-blur-md focus-ring"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 280, damping: 32 }
            }
            className="relative w-full h-full overflow-hidden flex flex-col bg-[hsl(var(--surface-0))]"
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <AnimatePresence mode="wait" initial={false}>
                <motion.img
                  key={currentTrack.id || currentTrack.thumbnail || currentTrack.title}
                  src={currentTrack.thumbnail}
                  alt=""
                  aria-hidden="true"
                  initial={{ opacity: 0, scale: 1.25 }}
                  animate={{
                    opacity: 0.42,
                    scale: 1.38,
                    transition: {
                      duration: reduceMotion ? 0 : 0.7,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  }}
                  exit={{
                    opacity: 0,
                    transition: {
                      duration: reduceMotion ? 0 : 0.35,
                      ease: [0.4, 0, 1, 1],
                    },
                  }}
                  className="absolute left-1/2 top-1/2 h-[150vmax] w-[150vmax] -translate-x-1/2 -translate-y-1/2 object-cover blur-[120px] saturate-[1.35] ambient-drift"
                />
              </AnimatePresence>
              <div aria-hidden="true" className="absolute inset-0 now-playing-aurora" />
              <div aria-hidden="true" className="absolute inset-0 now-playing-vignette" />
            </div>

            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between px-5 md:px-7 py-3.5 border-b border-white/[0.08] flex-shrink-0">
              <button
                type="button"
                onClick={closeExpandedPlayer}
                className="flex items-center gap-2 text-sm text-ink-3 hover:text-ink transition-colors focus-ring rounded-lg px-2 py-1"
              >
                <ChevronDown className="w-4 h-4" />
                Minimize
              </button>
              <div className="text-center hidden md:block px-4 min-w-0">
                <p className="font-genz-mono text-[10px] text-ink-4">
                  Now playing · Issue {issueNo}
                </p>
                <p className="font-vintage-display text-[16px] text-ink truncate max-w-[34rem] mx-auto mt-1">
                  {currentTrack.title}
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenFull}
                className="flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink transition-colors focus-ring rounded-lg px-2 py-1"
              >
                Open full page
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Body — 2 columns on desktop, stacked on mobile */}
            <motion.div
              className="relative z-10 flex-1 grid grid-cols-1 md:grid-cols-[1.08fr_1fr] gap-5 md:gap-9 p-4 md:px-8 md:py-6 overflow-hidden"
              variants={bodyStagger}
              initial="initial"
              animate="animate"
            >
              {/* Left: centered cover stage */}
              <motion.section
                variants={fadeUp}
                className="flex justify-center min-w-0 min-h-0"
              >
                <div className="vintage-genz-shell w-full max-w-[500px] flex flex-col items-center gap-[clamp(9px,1.6vh,16px)] px-4 md:px-6 py-4 md:py-5">
                <div
                  ref={tiltRef}
                  {...tiltHandlers}
                  className="vintage-frame tilt relative w-full max-w-[460px] aspect-video rounded-2xl overflow-hidden shadow-elev-5 shadow-accent vinyl-shadow"
                >
                  <motion.img
                    layoutId="footer-art"
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/15" />
                  <span aria-hidden="true" className="tilt-gloss absolute inset-0" />
                  <AnimatePresence>
                    {isPlaying && (
                      <motion.div
                        key="now-playing-badge"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: reduceMotion ? 0 : 0.2 }}
                        className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/45 px-2.5 py-1 backdrop-blur-md"
                      >
                        <span aria-hidden="true" className="live-dot" />
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-bone">
                          Live
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="text-center w-full min-w-0">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="w-5 h-px bg-track" />
                    <p className="eyebrow eyebrow-accent font-genz-mono">Now playing</p>
                  </div>
                  <div key={currentTrack.id || currentTrack.title} className="mask-rise block w-full">
                    <h2 className="font-vintage-display text-[clamp(26px,4.4vh,50px)] text-ink leading-[0.95]">
                      <span>{currentTrack.title}</span>
                    </h2>
                  </div>
                  <p className="font-editorial text-[15px] text-ink-2 mt-1.5 truncate">
                    by {currentTrack.artist}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
                    <span className="issue-pill vintage-chip">Issue {issueNo}</span>
                    <span className="issue-pill vintage-chip">{currentTrack.album || 'Single'}</span>
                    <span className="issue-pill vintage-chip">{playbackDuration}</span>
                  </div>
                </div>

                {/* Progress */}
                <div
                  ref={scrubberRef}
                  onMouseMove={(event) => updateScrubPreview(event.clientX)}
                  onMouseLeave={() => setScrubPreview(null)}
                  className={cn('player-seekbar w-full relative', isPlaying && 'scrubber-glow')}
                >
                  {showScrubPreview && (
                    <span
                      className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded-sharp border border-white/15 bg-black/60 px-2 py-0.5 font-mono text-[10px] tracking-[0.08em] text-bone z-10"
                      style={{ left: `${scrubPreviewPct}%` }}
                    >
                      {formatTime(scrubPreview)}
                    </span>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink-3 w-10 text-right tabular-nums">
                      {formatTime(progress)}
                    </span>
                    <Slider
                      value={[progress]}
                      max={duration || 100}
                      step={1}
                      onValueChange={(v) => seekTo(v[0])}
                      className="flex-1"
                      aria-label="Seek"
                    />
                    <span className="text-xs text-ink-3 w-10 tabular-nums">
                      {formatTime(duration)}
                    </span>
                  </div>
                </div>

                {/* Controls */}
                <div className="vintage-toolbar flex items-center justify-center gap-4 w-full px-2 py-2">
                  <motion.button
                    whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                    onClick={toggleShuffle}
                    className={cn(
                      'p-2.5 rounded-full transition-colors focus-ring bg-white/[0.03] hover:bg-white/[0.10]',
                      shuffle ? 'text-accent bg-accent-soft' : 'text-ink-3 hover:text-ink',
                    )}
                    aria-label="Toggle shuffle"
                  >
                    <Shuffle className="w-5 h-5" />
                  </motion.button>
                  <motion.button
                    whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                    onClick={playPrevious}
                    disabled={!canGoPrevious}
                    className="p-2.5 text-ink hover:text-accent transition-colors focus-ring rounded-full bg-white/[0.03] hover:bg-white/[0.10] disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Previous"
                  >
                    <SkipBack className="w-6 h-6" />
                  </motion.button>
                  <motion.button
                    whileHover={reduceMotion ? undefined : { scale: 1.04 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                    onClick={togglePlay}
                    className={cn(
                      'w-16 h-16 rounded-full text-track-fg flex items-center justify-center shadow-accent focus-ring ring-1 ring-white/20',
                      isPlaying && 'pulse-glow',
                    )}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 30% 25%, hsl(var(--ink-primary) / 0.22), transparent 55%), linear-gradient(135deg, hsl(var(--track-accent)), hsl(var(--track-accent-strong)))',
                    }}
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 fill-current" />
                    ) : (
                      <Play className="w-6 h-6 fill-current ml-0.5" />
                    )}
                  </motion.button>
                  <motion.button
                    whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                    onClick={playNext}
                    disabled={!canGoNext}
                    className="p-2.5 text-ink hover:text-accent transition-colors focus-ring rounded-full bg-white/[0.03] hover:bg-white/[0.10] disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Next"
                  >
                    <SkipForward className="w-6 h-6" />
                  </motion.button>
                  <motion.button
                    whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                    onClick={toggleRepeat}
                    className={cn(
                      'p-2.5 rounded-full transition-colors focus-ring bg-white/[0.03] hover:bg-white/[0.10]',
                      repeat !== 'off'
                        ? 'text-accent bg-accent-soft'
                        : 'text-ink-3 hover:text-ink',
                    )}
                    aria-label="Cycle repeat"
                  >
                    {repeat === 'one' ? (
                      <Repeat1 className="w-5 h-5" />
                    ) : (
                      <Repeat className="w-5 h-5" />
                    )}
                  </motion.button>
                </div>

                {/* Volume + favorite */}
                <div className="vintage-toolbar flex items-center gap-4 w-full px-3 py-2">
                  <HeartButton track={currentTrack} />
                  <div className="flex items-center gap-2 flex-1 max-w-xs">
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="text-ink-3 hover:text-ink transition-colors focus-ring rounded-full p-1"
                      aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <Slider
                      value={[volume * 100]}
                      max={100}
                      step={1}
                      onValueChange={(v) => setVolume(v[0] / 100)}
                      className="flex-1"
                      aria-label="Volume"
                    />
                  </div>
                </div>
                </div>
              </motion.section>

              {/* Right: tabs (Up next / Lyrics / Related) */}
              <motion.section variants={fadeUp} className="vintage-genz-shell flex flex-col min-h-0 p-3 md:p-4">
                <div className="mb-3">
                  <Tabs
                    items={panelItems}
                    value={panel}
                    onValueChange={setPanel}
                    variant="underline"
                    className="w-full vintage-tablist"
                  />
                  <div className="mt-3 px-1 flex items-center gap-3">
                    <span className="font-genz-mono text-[10px] text-ink-4">
                      Listen room
                    </span>
                    <span className="editorial-rule" />
                  </div>
                </div>
                <div className="vintage-toolbar flex-1 min-h-0 overflow-hidden p-2.5">
                  <AnimatePresence mode="wait" initial={false}>
                    {panel === 'queue' && (
                      <motion.div
                        key="queue-panel"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: reduceMotion ? 0 : 0.2 }}
                        className="h-full"
                      >
                        <QueuePanel />
                      </motion.div>
                    )}
                    {panel === 'lyrics' && (
                      <motion.div
                        key="lyrics-panel"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: reduceMotion ? 0 : 0.2 }}
                        className="h-full"
                      >
                        <LyricsPanel />
                      </motion.div>
                    )}
                    {panel === 'related' && (
                      <motion.div
                        key="related-panel"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: reduceMotion ? 0 : 0.2 }}
                        className="h-full overflow-y-auto custom-scrollbar"
                      >
                        <RelatedPanel />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.section>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExpandedPlayer;
