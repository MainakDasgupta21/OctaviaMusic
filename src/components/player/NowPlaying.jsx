import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ListMusic, Mic2, Sparkles } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useColorExtraction } from '@/hooks/use-color-extraction';
import { fadeUp, isReducedMotion } from '@/design/motion';
import Tabs from '@/components/ui-v2/Tabs';
import EmptyState from '@/components/ui-v2/EmptyState';
import LyricsPanel from '@/components/player/LyricsPanel';
import QueuePanel from '@/components/player/QueuePanel';
import TrackHeadline from '@/components/player/TrackHeadline';
import SeekBar from '@/components/player/SeekBar';
import TransportControls from '@/components/player/TransportControls';
import VolumeControl from '@/components/player/VolumeControl';
import RelatedRail from '@/components/player/RelatedRail';
import IssueMeta from '@/components/player/IssueMeta';
import { pickPlaceholder, sanitizeImageUrl } from '@/lib/media-sanitize';
import { cn } from '@/lib/utils';

const PANELS = [
  { id: 'queue', label: 'Up next', icon: ListMusic },
  { id: 'lyrics', label: 'Lyrics', icon: Mic2 },
  { id: 'related', label: 'Related', icon: Sparkles },
];

// Background album-art layer — the song image IS the player backdrop.
// - Recognisable: only a soft blur, not the heavy bloom from before.
// - Always in motion: a slow Ken-Burns drift (np-cover-kenburns) breathes life
//   into the screen without distracting from the controls.
// - Carries layoutId="footer-art" so the footer thumbnail flies into here
//   when the user opens the player — a premium "expand to fullscreen" moment.
const handleBackdropError = (event) => {
  const fallback = pickPlaceholder('track');
  if (event?.currentTarget && !event.currentTarget.dataset.fellBack) {
    event.currentTarget.src = fallback;
    event.currentTarget.dataset.fellBack = '1';
  }
};

const AmbientBackdrop = ({ track, reduceMotion }) => {
  const safeSrc =
    sanitizeImageUrl(track.thumbnail, { fallback: pickPlaceholder('track') })
    || pickPlaceholder('track');
  return (
  <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
    {/* Solid dark base in case the image hasn't loaded yet. */}
    <div className="absolute inset-0 bg-[hsl(var(--surface-0))]" />

    <AnimatePresence mode="popLayout" initial={false}>
      <motion.img
        key={track.id || safeSrc || track.title}
        layoutId="footer-art"
        src={safeSrc}
        alt=""
        aria-hidden="true"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={handleBackdropError}
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          transition: { duration: reduceMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] },
        }}
        exit={{
          opacity: 0,
          transition: { duration: reduceMotion ? 0 : 0.3, ease: [0.4, 0, 1, 1] },
        }}
        className="absolute inset-0 w-full h-full object-cover np-cover-kenburns"
        style={{ filter: 'blur(20px) saturate(1.08)', viewTransitionName: 'vt-now-cover' }}
      />
    </AnimatePresence>

    {/* Album-tinted halo — a wider, softer wash than the prior crisp ramp
        so the song's colour reads as ambient atmosphere rather than a
        gradient band. 20% peak opacity blends into the cinematic stack
        without competing with the title. */}
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        backgroundImage:
          'radial-gradient(120% 80% at 50% 8%, hsl(var(--track-accent) / 0.20) 0%, transparent 60%)',
      }}
    />

    {/* Cinematic atmosphere stack:
        dim → vignette → album-color bloom → diagonal light leak → film grain → AA scrim. */}
    <div aria-hidden="true" className="absolute inset-0 bg-black/40" />
    <div aria-hidden="true" className="absolute inset-0 now-playing-vignette" />
    <div aria-hidden="true" className="absolute inset-0 np-bloom" />
    <div aria-hidden="true" className="absolute inset-0 np-light-leak" />
    <div aria-hidden="true" className="absolute inset-0 np-grain" />
    <div aria-hidden="true" className="absolute inset-0 np-scrim" />
  </div>
  );
};

// THE canonical now-playing surface. `variant` only swaps chrome / padding;
// the hero (title → scrub → transports → volume) is identical.
const NowPlaying = ({ variant = 'page', onMinimize, onOpenFull }) => {
  const { currentTrack, queue } = usePlayer();
  const reduceMotion = isReducedMotion();
  const [panel, setPanel] = useState('queue');
  const swipeRef = useRef(null);

  useColorExtraction(currentTrack?.thumbnail);

  const leftStagger = useMemo(
    () => ({
      initial: {},
      animate: {
        transition: {
          staggerChildren: reduceMotion ? 0 : 0.06,
          delayChildren: reduceMotion ? 0 : 0.18, // wait for layoutId flight
        },
      },
    }),
    [reduceMotion],
  );

  const panelItems = useMemo(
    () =>
      PANELS.map((item) =>
        item.id === 'queue' ? { ...item, count: queue?.length ?? 0 } : item,
      ),
    [queue?.length],
  );

  if (variant === 'page' && !currentTrack) {
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
  if (!currentTrack) return null;

  const isOverlay = variant === 'overlay';
  const onNavigateAway = isOverlay ? onMinimize : undefined;

  const handleSwipeStart = (event) => {
    const t = event.touches?.[0];
    if (t) swipeRef.current = { x: t.clientX, y: t.clientY };
  };
  const handleSwipeEnd = (event) => {
    const start = swipeRef.current;
    swipeRef.current = null;
    const t = event.changedTouches?.[0];
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    const idx = PANELS.findIndex((p) => p.id === panel);
    const nextIdx =
      dx < 0 ? Math.min(PANELS.length - 1, idx + 1) : Math.max(0, idx - 1);
    setPanel(PANELS[nextIdx].id);
  };

  const grid = (
    <motion.div
      className={cn(
        'flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] md:grid-rows-[minmax(0,1fr)] flex-1 min-h-0',
        isOverlay ? 'gap-5 md:gap-7' : 'gap-5 lg:gap-7',
      )}
    >
      {/* Left: focused control surface. The album art lives behind the entire
          page (AmbientBackdrop), so this card is a clean glass overlay with the
          title, scrubber, transports and volume. */}
      <div className="relative w-full max-w-[560px] mx-auto md:h-full">
        {/* Outer breathing accent halo — soft album-colour glow that surrounds
            the card and slowly breathes. Pure decoration, behind the card. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-6 -z-10 np-card-glow"
        />

        <motion.div
          variants={leftStagger}
          initial="initial"
          animate="animate"
          className="relative w-full h-full flex flex-col min-h-0 rounded-[24px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(18,14,12,0.46),rgba(10,8,8,0.34))] backdrop-blur-2xl shadow-[0_40px_90px_-46px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden"
        >
          {/* Top inner sheen — lifts the glass and gives an edge highlight. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[24px] bg-[radial-gradient(120%_60%_at_50%_-10%,rgba(255,255,255,0.08),transparent_60%)]"
          />
          {/* Bottom inner album-accent wash — bleeds the song's colour into
              the bottom of the card for a glowing-floor look. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[24px]"
            style={{
              backgroundImage:
                'radial-gradient(110% 55% at 50% 115%, hsl(var(--track-accent) / 0.18), transparent 62%)',
            }}
          />

          <div className="relative flex-1 min-h-0 flex flex-col justify-center gap-[clamp(16px,2.6vh,26px)] px-6 md:px-9 py-8 md:py-10">
            <motion.div variants={fadeUp} className="w-full">
              <TrackHeadline onNavigate={onNavigateAway} />
            </motion.div>

            <motion.div variants={fadeUp} className="w-full">
              <SeekBar />
            </motion.div>

            <motion.div variants={fadeUp} className="w-full">
              <TransportControls />
            </motion.div>
          </div>

          <motion.div
            variants={fadeUp}
            className="relative px-6 md:px-9 pb-6 md:pb-7"
          >
            <VolumeControl className="hidden sm:flex" />
          </motion.div>
        </motion.div>
      </div>

      {/* Right: queue / lyrics / related rail */}
      <motion.section
        initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reduceMotion ? 0 : 0.22,
          ease: [0.22, 1, 0.36, 1],
          delay: reduceMotion ? 0 : 0.24,
        }}
        className="flex flex-1 min-h-0 md:h-full flex-col rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,14,12,0.42),rgba(10,8,8,0.32))] backdrop-blur-2xl shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] overflow-hidden"
      >
        <div className="shrink-0 px-4 pt-4">
          <Tabs
            items={panelItems}
            value={panel}
            onValueChange={setPanel}
            variant="underline"
            className="w-full"
          />
        </div>

        <div
          className="flex-1 min-h-0 px-3 pb-3 pt-3"
          onTouchStart={handleSwipeStart}
          onTouchEnd={handleSwipeEnd}
        >
          <div className="h-full rounded-[18px] border border-white/[0.06] bg-black/30 p-3">
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
                  className="h-full"
                >
                  <RelatedRail variant={variant} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );

  return (
    <div className="relative isolate flex h-full min-h-0 flex-col overflow-hidden">
      <AmbientBackdrop track={currentTrack} reduceMotion={reduceMotion} />

      {isOverlay ? (
        <IssueMeta variant="overlay" onMinimize={onMinimize} onOpenFull={onOpenFull} />
      ) : null}

      <div
        className={cn(
          'relative z-10 flex flex-1 min-h-0 flex-col overflow-hidden',
          isOverlay
            ? 'p-4 md:px-8 md:py-6'
            : 'px-4 lg:px-8 pt-4 lg:pt-6 pb-[100px] md:pb-[108px]',
        )}
      >
        {grid}
      </div>
    </div>
  );
};

export default NowPlaying;
