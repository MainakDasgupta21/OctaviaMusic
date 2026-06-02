import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  Mic2,
  Sparkles,
} from 'lucide-react';
import { usePlayer, usePlayerProgress } from '@/contexts/PlayerContext';
import HeartButton from '@/components/HeartButton';
import { Slider } from '@/components/ui/slider';
import LyricsPanel from '@/components/player/LyricsPanel';
import QueuePanel from '@/components/player/QueuePanel';
import Tabs from '@/components/ui-v2/Tabs';
import EmptyState from '@/components/ui-v2/EmptyState';
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

const RelatedRail = () => {
  const { history, currentTrack, playTrack } = usePlayer();
  const list = history.filter((t) => t.id !== currentTrack?.id).slice(0, 8);
  if (list.length === 0) {
    return (
      <p className="font-editorial italic text-[13px] text-ink-3 px-2 py-6">
        Play more tracks to unlock related suggestions.
      </p>
    );
  }
  return (
    <ul className="space-y-1">
      {list.map((t, i) => (
        <li key={t.id}>
          <button
            type="button"
            onClick={() => playTrack(t)}
            className="group w-full flex items-center gap-3 px-2 py-2 rounded-sharp hover:bg-white/[0.04] text-left focus-ring transition-colors"
          >
            <span
              aria-hidden="true"
              className="font-display italic text-base leading-none text-ink-4 w-6 text-center tabular-nums"
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <img
              src={t.thumbnail}
              alt=""
              className="w-10 h-10 rounded-sharp object-cover ring-1 ring-white/10"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-medium truncate text-ink">{t.title}</p>
              <p className="font-editorial text-[12px] text-ink-3 truncate mt-0.5">
                by {t.artist}
              </p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
};

const PlayerPage = () => {
  const {
    currentTrack,
    queue,
    isPlaying,
    togglePlay,
    seekTo,
    playNext,
    playPrevious,
    canGoNext,
    shuffle,
    toggleShuffle,
    repeat,
    toggleRepeat,
  } = usePlayer();
  const { progress, duration, canGoPrevious } = usePlayerProgress();
  const [panel, setPanel] = useState('queue');
  const [scrubPreview, setScrubPreview] = useState(null);
  const scrubberRef = useRef(null);
  const reduceMotion = isReducedMotion();
  const { ref: tiltRef, handlers: tiltHandlers } = useTilt({ max: 5, scale: 1.01 });
  const bodyStagger = useMemo(() => staggerChildren(0.08, 0.04), []);

  useColorExtraction(currentTrack?.thumbnail);

  // Hard-lock document scrolling while this route is mounted.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const { documentElement, body } = document;
    const prevHtmlOverflow = documentElement.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    documentElement.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      documentElement.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  const titleParts = useMemo(() => {
    if (!currentTrack?.title) return { lead: '', accent: '' };
    const t = currentTrack.title.trim();
    // Italicize the trailing word for editorial emphasis (subtle, never aggressive).
    const idx = t.lastIndexOf(' ');
    if (idx === -1 || t.length < 14) return { lead: t, accent: '' };
    return { lead: t.slice(0, idx), accent: t.slice(idx + 1) };
  }, [currentTrack?.title]);

  const panelItems = useMemo(
    () =>
      PANELS.map((item) =>
        item.id === 'queue' ? { ...item, count: queue?.length ?? 0 } : item,
      ),
    [queue?.length],
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

  const showScrubPreview =
    Number.isFinite(scrubPreview) && Number.isFinite(duration) && duration > 0;
  const scrubPreviewPct = showScrubPreview
    ? Math.min(98, Math.max(2, (scrubPreview / duration) * 100))
    : 0;

  if (!currentTrack) {
    return (
      <div className="h-full flex items-center justify-center p-10">
        <EmptyState
          icon={ListMusic}
          title="No track playing"
          description="Pick a song from Home, Search, or any playlist to start listening."
        />
      </div>
    );
  }

  return (
    <div className="relative isolate flex h-full min-h-0 flex-col overflow-hidden">
      {/* Ambient backdrop — blurred art bloom + aurora + vignette, clipped to the page */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={currentTrack.id || currentTrack.thumbnail || currentTrack.title}
            src={currentTrack.thumbnail}
            alt=""
            aria-hidden="true"
            initial={{ opacity: 0, scale: 1.2 }}
            animate={{
              opacity: 0.4,
              scale: 1.36,
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
            className="absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2 object-cover blur-[150px] saturate-[1.35] ambient-drift"
          />
        </AnimatePresence>
        <div aria-hidden="true" className="absolute inset-0 now-playing-aurora opacity-90" />
        <div aria-hidden="true" className="absolute inset-0 now-playing-vignette" />
      </div>

      {/* Content column — fills the locked viewport; reserves the footer player gutter */}
      <div className="relative z-10 flex flex-1 min-h-0 flex-col px-5 lg:px-10 pt-4 lg:pt-6 pb-[104px]">
        {/* Cover-spread dateline */}
        <div
          aria-hidden="true"
          className="hidden md:flex shrink-0 items-center justify-between text-[10px] font-genz-mono text-ink-4 mb-4 pb-3 border-b border-white/[0.08]"
        >
          <span>The cover spread · Issue {issueNo}</span>
          <span className="flex items-center gap-3">
            <span className="text-ink-3">✦</span>
            <span>Now playing · {currentTrack.artist}</span>
            <span className="text-ink-3">✦</span>
          </span>
          <span>Side A</span>
        </div>

        <motion.div
          variants={bodyStagger}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 md:grid-cols-[1.08fr_1fr] md:grid-rows-[minmax(0,1fr)] gap-7 lg:gap-11 flex-1 min-h-0"
        >
          {/* Left: vertically-centered cover stage */}
          <motion.section
            variants={fadeUp}
            className="flex justify-center items-stretch min-w-0 min-h-0"
          >
            <div className="vintage-genz-shell w-full max-w-[470px] h-full flex flex-col items-center justify-center gap-[clamp(9px,1.6vh,18px)] min-h-0 px-5 lg:px-6 py-5 lg:py-6">
              <div
                ref={tiltRef}
                {...tiltHandlers}
                className="vintage-frame tilt relative aspect-square h-[clamp(156px,29vh,300px)] max-w-full rounded-2xl overflow-hidden shadow-elev-5 shadow-accent vinyl-shadow"
              >
                <motion.img
                  layoutId="footer-art"
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-full h-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/15" />
                <span aria-hidden="true" className="tilt-gloss absolute inset-0" />
                <AnimatePresence>
                  {isPlaying && (
                    <motion.div
                      key="now-playing-badge"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: reduceMotion ? 0 : 0.2 }}
                      className="absolute top-3 left-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/50 px-2.5 py-1 backdrop-blur-md"
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
                <p className="eyebrow eyebrow-accent mb-2 flex items-center gap-2 justify-center font-genz-mono">
                  <span className="w-5 h-px bg-track" />
                  Now playing
                </p>
                <div
                  key={currentTrack.id || currentTrack.title}
                  className="mask-rise block w-full"
                >
                  <h1 className="font-vintage-display text-[clamp(23px,2.75vh,42px)] leading-[0.98] text-ink">
                    <span>
                      {titleParts.lead}
                      {titleParts.accent ? (
                        <>
                          {' '}
                          <em className="font-editorial text-track not-italic">
                            {titleParts.accent}
                          </em>
                        </>
                      ) : null}
                    </span>
                  </h1>
                </div>
                <p className="font-editorial text-[14px] text-ink-3 mt-2 truncate">
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
                    className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded-sharp border border-white/15 bg-black/65 px-2 py-0.5 font-mono text-[10px] tracking-[0.08em] text-bone z-10"
                    style={{ left: `${scrubPreviewPct}%` }}
                  >
                    {formatTime(scrubPreview)}
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-ink-3 w-10 text-right tabular-nums tracking-tight">
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
                  <span className="font-mono text-[11px] text-ink-3 w-10 tabular-nums tracking-tight">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="vintage-toolbar flex items-center justify-center gap-3 lg:gap-4 w-full py-2 px-2">
                <motion.button
                  whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                  onClick={toggleShuffle}
                  className={cn(
                    'p-2.5 rounded-full transition-colors focus-ring bg-white/[0.03] hover:bg-white/[0.10]',
                    shuffle ? 'text-accent bg-accent-soft' : 'text-ink-3 hover:text-ink',
                  )}
                  aria-label="Toggle shuffle"
                  aria-pressed={shuffle}
                >
                  <Shuffle className="w-5 h-5" strokeWidth={1.75} />
                </motion.button>
                <motion.button
                  whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                  onClick={playPrevious}
                  disabled={!canGoPrevious}
                  className="p-2.5 text-ink hover:text-accent transition-colors focus-ring rounded-full bg-white/[0.03] hover:bg-white/[0.10] disabled:opacity-25 disabled:cursor-not-allowed"
                  aria-label="Previous"
                >
                  <SkipBack className="w-6 h-6" />
                </motion.button>
                <motion.button
                  whileHover={reduceMotion ? undefined : { scale: 1.04 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                  onClick={togglePlay}
                  className={cn(
                    'w-16 h-16 rounded-full text-track-fg flex items-center justify-center shadow-accent ring-1 ring-white/20 focus-ring',
                    isPlaying && 'pulse-glow',
                  )}
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 30% 25%, hsl(var(--ink-primary) / 0.25), transparent 55%), linear-gradient(135deg, hsl(var(--track-accent)), hsl(var(--track-accent-strong)))',
                  }}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 fill-current" />
                  ) : (
                    <Play className="w-7 h-7 fill-current ml-0.5" />
                  )}
                </motion.button>
                <motion.button
                  whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                  onClick={playNext}
                  disabled={!canGoNext}
                  className="p-2.5 text-ink hover:text-accent transition-colors focus-ring rounded-full bg-white/[0.03] hover:bg-white/[0.10] disabled:opacity-25 disabled:cursor-not-allowed"
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
                  aria-pressed={repeat !== 'off'}
                >
                  {repeat === 'one' ? (
                    <Repeat1 className="w-5 h-5" strokeWidth={1.75} />
                  ) : (
                    <Repeat className="w-5 h-5" strokeWidth={1.75} />
                  )}
                </motion.button>
                <span className="mx-1 h-6 w-px bg-white/[0.08]" aria-hidden="true" />
                <HeartButton track={currentTrack} />
              </div>
            </div>
          </motion.section>

          {/* Right: listen room (full-height glass column with internal scroll) */}
          <motion.section
            variants={fadeUp}
            className="vintage-genz-shell flex h-full min-h-0 flex-col p-3 lg:p-4"
          >
            <div className="shrink-0 mb-3">
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
                    <RelatedRail />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        </motion.div>
      </div>
    </div>
  );
};

export default PlayerPage;
