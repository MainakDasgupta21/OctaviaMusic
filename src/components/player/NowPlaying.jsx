import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ListMusic, Mic2, Sparkles } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePlayer, usePlayerProgress } from '@/contexts/PlayerContext';
import { durations, easings, fadeUp, isReducedMotion } from '@/design/motion';
import Tabs from '@/components/ui-v2/Tabs';
import EmptyState from '@/components/ui-v2/EmptyState';
import Button from '@/components/ui-v2/Button';
import { Slider } from '@/components/ui/slider';
import LyricsPanel from '@/components/player/LyricsPanel';
import QueuePanel from '@/components/player/QueuePanel';
import TrackHeadline from '@/components/player/TrackHeadline';
import TransportControls from '@/components/player/TransportControls';
import VolumeControl from '@/components/player/VolumeControl';
import PlayerRelatedRail from '@/components/player/RelatedRail';
import { formatTime } from '@/lib/player-format';
import { pickPlaceholder, sanitizeImageUrl } from '@/lib/media-sanitize';
import { cn } from '@/lib/utils';

const PANELS = [
  { id: 'queue', label: 'Queue', icon: ListMusic },
  { id: 'lyrics', label: 'Lyrics', icon: Mic2 },
  { id: 'related', label: 'Related', icon: Sparkles },
];

const handleImageError = (event) => {
  const fallback = pickPlaceholder('track');
  if (event?.currentTarget && !event.currentTarget.dataset.fellBack) {
    event.currentTarget.src = fallback;
    event.currentTarget.dataset.fellBack = '1';
  }
};

const upgradeArtworkQuality = (url) => {
  if (typeof url !== 'string') return url;
  return url
    .replace(/=w\d+-h\d+/, '=w544-h544')
    .replace(/=s\d+/, '=s544')
    .replace(/\/maxresdefault\.jpg/, '/hqdefault.jpg')
    .replace(/\/mqdefault\.jpg/, '/hqdefault.jpg')
    .replace(/\/sddefault\.jpg/, '/hqdefault.jpg');
};

const resolveArtwork = (track) =>
  sanitizeImageUrl(upgradeArtworkQuality(track?.thumbnail), { fallback: pickPlaceholder('track') })
  || pickPlaceholder('track');

const AmbientBackdrop = ({ track, reduceMotion }) => {
  const safeSrc = resolveArtwork(track);
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-surface-0" />

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.img
          key={track.id || safeSrc || track.title}
          src={safeSrc}
          alt=""
          aria-hidden="true"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={handleImageError}
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            transition: { duration: reduceMotion ? 0 : durations.long, ease: easings.emphasis },
          }}
          exit={{
            opacity: 0,
            transition: { duration: reduceMotion ? 0 : durations.short, ease: easings.accel },
          }}
          className="absolute inset-0 h-full w-full object-cover np-cover-kenburns"
          style={{ filter: 'blur(26px) saturate(1.05)' }}
        />
      </AnimatePresence>

      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(100% 70% at 50% 8%, hsl(var(--track-accent) / 0.16) 0%, transparent 70%)',
        }}
      />
      <div aria-hidden="true" className="absolute inset-0 now-playing-vignette" />
      <div aria-hidden="true" className="absolute inset-0 np-scrim" />
    </div>
  );
};

const NowPlaying = () => {
  const navigate = useNavigate();
  const { currentTrack, queue, isPlaying, seekTo } = usePlayer();
  const { progress, duration } = usePlayerProgress();
  const reduceMotion = isReducedMotion();
  const [searchParams] = useSearchParams();
  const [panel, setPanel] = useState('queue');
  const [seekPreview, setSeekPreview] = useState(null);
  const swipeRef = useRef(null);
  const queryPanel = searchParams.get('panel');
  const stableDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const displayedProgress = Number.isFinite(seekPreview)
    ? Math.max(0, seekPreview)
    : Math.max(0, progress || 0);
  const canSeek = stableDuration > 0;

  useEffect(() => {
    if (PANELS.some((item) => item.id === queryPanel)) {
      setPanel(queryPanel);
    }
  }, [queryPanel]);

  useEffect(() => {
    setSeekPreview(null);
  }, [currentTrack?.id]);

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

  if (!currentTrack) {
    return (
      <div className="h-full flex items-center justify-center p-10">
        <EmptyState
          icon={ListMusic}
          title="No track playing"
          description="Pick a song from Home, Search, or any playlist to start listening."
          action={(
            <>
              <Button onClick={() => navigate('/')}>Go home</Button>
              <Button variant="editorial" onClick={() => navigate('/search')}>
                Search tracks
              </Button>
            </>
          )}
        />
      </div>
    );
  }

  const artworkSrc = resolveArtwork(currentTrack);

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
      className="mx-auto grid w-full max-w-[1380px] grid-cols-1 gap-3 sm:gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(300px,360px)] xl:gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(320px,392px)] 2xl:gap-6"
    >
      <motion.section
        variants={leftStagger}
        initial="initial"
        animate="animate"
        className="relative min-h-0 overflow-hidden rounded-card border border-white/[0.08] bg-[linear-gradient(180deg,hsl(var(--surface-1)/0.74),hsl(var(--surface-0)/0.64))] backdrop-blur-2xl shadow-elev-4"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(80% 68% at 52% 102%, hsl(var(--track-accent) / 0.14), transparent 74%)',
          }}
        />

        <div className="relative flex h-full min-h-0 flex-col p-3 sm:p-5 lg:p-6">
          <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(220px,320px)_minmax(0,1fr)] lg:items-center xl:h-full xl:min-h-0">
            <motion.div variants={fadeUp} className="mx-auto w-full max-w-[min(360px,58vh)] sm:max-w-[min(360px,52vh)] lg:max-w-[360px]">
              <div className="mx-auto aspect-square w-full -translate-y-2 sm:-translate-y-3 p-[11.5%]">
                <div className="np-vinyl-art relative h-full w-full rounded-full overflow-hidden">
                  <div
                    aria-hidden="true"
                    className={cn(
                      'vinyl-disc absolute inset-0 rounded-full',
                      isPlaying && !reduceMotion && 'vinyl-spinning',
                    )}
                  />
                  <div aria-hidden="true" className="vinyl-gloss absolute inset-0 rounded-full" />
                  <div
                    aria-hidden="true"
                    className="absolute inset-[9%] rounded-full border border-white/5"
                  />
                  <div className="absolute inset-[29%] rounded-full overflow-hidden ring-1 ring-white/[0.18] shadow-[0_10px_24px_-12px_rgba(0,0,0,0.6)]">
                    <img
                      key={currentTrack.id || artworkSrc || currentTrack.title}
                      src={artworkSrc}
                      alt={currentTrack.title || 'Current track artwork'}
                      onError={handleImageError}
                      decoding="async"
                      loading="eager"
                      fetchpriority="high"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="min-w-0 space-y-3.5 sm:space-y-4 xl:max-w-[640px]">
              <TrackHeadline />
              <div className="rounded-panel border border-white/[0.08] bg-surface-0/46 p-4 shadow-elev-2 sm:p-5">
                <TransportControls />
              </div>
              <div className="w-full space-y-2.5 rounded-panel border border-white/[0.06] bg-surface-0/34 px-3.5 py-3 sm:px-4 sm:py-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-4 tabular">
                    {formatTime(displayedProgress)}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-4 tabular">
                    {formatTime(stableDuration)}
                  </span>
                </div>
                <Slider
                  value={[Math.min(displayedProgress, stableDuration || 0)]}
                  max={stableDuration > 0 ? stableDuration : 100}
                  step={1}
                  onValueChange={(value) => setSeekPreview(value[0])}
                  onValueCommit={(value) => {
                    setSeekPreview(null);
                    seekTo(Math.max(0, Math.min(stableDuration, value[0])));
                  }}
                  disabled={!canSeek}
                  className="w-full [&_.slider-track]:h-[2.75px] [&_.slider-track]:transition-[height] [&_.slider-track]:duration-short [&_.slider-track]:ease-emphasis hover:[&_.slider-track]:h-[4px] focus-within:[&_.slider-track]:h-[4px]"
                  aria-label="Playback progress"
                />
              </div>
              <VolumeControl
                compact
                className="max-w-[400px] border-white/[0.06] bg-surface-0/36"
              />
            </motion.div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: reduceMotion ? 0 : durations.med,
          ease: easings.emphasis,
          delay: reduceMotion ? 0 : durations.short,
        }}
        className="flex min-h-[240px] sm:min-h-[280px] flex-col overflow-hidden rounded-card border border-white/[0.08] bg-[linear-gradient(180deg,hsl(var(--surface-1)/0.72),hsl(var(--surface-0)/0.64))] backdrop-blur-2xl shadow-elev-3 xl:min-h-0 xl:flex-1"
      >
        <div className="shrink-0 px-3 pt-3 sm:px-4 sm:pt-4">
          <Tabs
            items={panelItems}
            value={panel}
            onValueChange={setPanel}
            ariaLabel="Now playing information panels"
            variant="pill"
            className="w-full"
          />
          <p className="px-1 pt-2 text-[10px] font-mono uppercase tracking-[0.12em] text-ink-4 sm:hidden">
            Swipe left or right to switch panels
          </p>
        </div>

        <div
          className="min-h-0 flex-1 p-2.5 sm:p-3 sm:pt-3 lg:p-3.5 lg:pt-3 xl:p-4 xl:pt-3"
          onTouchStart={handleSwipeStart}
          onTouchEnd={handleSwipeEnd}
        >
          <div className="h-full min-h-[210px] overflow-hidden rounded-panel border border-white/[0.06] bg-surface-0/56 p-2.5 sm:min-h-[240px] sm:p-3 xl:min-h-0">
            <AnimatePresence mode="wait" initial={false}>
              {panel === 'queue' && (
                <motion.div
                  key="queue-panel"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: reduceMotion ? 0 : durations.med, ease: easings.emphasis }}
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
                  transition={{ duration: reduceMotion ? 0 : durations.med, ease: easings.emphasis }}
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
                  transition={{ duration: reduceMotion ? 0 : durations.med, ease: easings.emphasis }}
                  className="h-full"
                >
                  <PlayerRelatedRail />
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

      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-2.5 xs:px-3.5 pt-3 pb-[var(--player-page-bottom-pad)] sm:px-5 sm:pt-4 lg:px-6 xl:px-8 xl:pt-6 2xl:overflow-hidden"
      >
        {grid}
      </div>
    </div>
  );
};

export default NowPlaying;
