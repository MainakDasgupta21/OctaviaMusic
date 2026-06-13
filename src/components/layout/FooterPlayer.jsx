import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePlayer, usePlayerProgress } from '@/contexts/PlayerContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useTransportActions } from '@/hooks/use-transport-actions';
import { usePlaybackLoading } from '@/hooks/use-playback-loading';
import { createCrossfadeController } from '@/lib/audio';
import MobileMiniPlayerSheet from '@/components/layout/MobileMiniPlayerSheet';

// react-player + its hls.js/dash.js bundle is the largest dep in the project
// (~470 KB gzip). Defer the chunk until a track is actually selected — users
// who never press play never pay for it. The Suspense fallback is null because
// the player element is visually `display: none` anyway.
const ReactPlayer = lazy(() => import('react-player'));
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Repeat1,
  ListMusic,
  AlertTriangle,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import QueuePanel from '@/components/player/QueuePanel';
import ProgressRing from '@/components/player/ProgressRing';
import { motion, AnimatePresence } from 'framer-motion';
import HeartButton from '@/components/HeartButton';
import AddToPlaylistButton from '@/components/playlist/AddToPlaylistButton';
import { useColorExtraction } from '@/hooks/use-color-extraction';
import { formatTime } from '@/lib/player-format';
import { pickPlaceholder, sanitizeImageUrl, sanitizeVideoId } from '@/lib/media-sanitize';
import { isReducedMotion } from '@/design/motion';
import { cn } from '@/lib/utils';

const QUALITY_PREFERENCE_ORDER = [
  'highres',
  'hd2160',
  'hd1440',
  'hd1080',
  'hd720',
  'large',
  'medium',
  'small',
  'tiny',
];

const FooterPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    togglePlay,
    setVolume,
    toggleMute,
    seekTo,
    playNext,
    playPrevious,
    shuffle,
    repeat,
    queue,
    playerRef,
    reportProgress,
    reportDuration,
    handleTrackEnded,
    canGoNext,
  } = usePlayer();
  const { progress, duration, canGoPrevious } = usePlayerProgress();
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useSettings();
  const reduceMotion = isReducedMotion();
  // Shared transport handlers — picks up SFX + haptic for visible buttons.
  // Media session keeps the raw `togglePlay/playNext/playPrevious` above so
  // OS-level triggers don't double up on click sounds.
  const transport = useTransportActions();

  // Buffering signal — true for the first ~1.5s after a track change until
  // playback progresses past a quarter-second. Drives a shimmer on the
  // seekbar and a pulse on the title so users know the player heard them.
  const isBuffering = usePlaybackLoading({
    trackId: currentTrack?.id,
    progress,
  });

  // Crossfade gain (0..1) multiplies the user's volume so the controller can
  // ramp the track in/out without clobbering the user's slider position.
  const [fadeGain, setFadeGain] = useState(1);
  const [seekPreview, setSeekPreview] = useState(null);
  const crossfadeSeconds = Math.max(0, Number(settings?.crossfadeSeconds) || 0);
  const crossfadeRef = useRef(null);
  if (!crossfadeRef.current) {
    crossfadeRef.current = createCrossfadeController({
      targetVolume: 1,
      onVolumeChange: (v) => setFadeGain(Math.max(0, Math.min(1, v))),
    });
  }
  // Reset fade gain + arm an ease-in whenever a new track starts. This also
  // covers the "no crossfade" case where the controller no-ops to 1 instantly.
  useEffect(() => {
    crossfadeRef.current?.armStart(crossfadeSeconds);
    // Cleanup on unmount of the player only.
    return undefined;
  }, [currentTrack?.id, crossfadeSeconds]);

  // While a track is playing, ask the controller to start fading out within
  // the last `crossfadeSeconds`. `tick` is idempotent — it only arms once
  // per track end.
  useEffect(() => {
    if (!isPlaying) return;
    if (!Number.isFinite(duration) || duration <= 0) return;
    crossfadeRef.current?.tick({
      progress,
      duration,
      fadeSec: crossfadeSeconds,
      currentVolume: fadeGain,
    });
  }, [progress, duration, isPlaying, crossfadeSeconds, fadeGain]);

  useEffect(() => () => crossfadeRef.current?.dispose(), []);

  // Mobile long-press quick-actions sheet. Tap on the mini-player opens the
  // full player page; a ~500ms press-and-hold opens this lightweight sheet.
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const longPressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handleMobilePressStart = useCallback(() => {
    longPressFiredRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      // Light haptic so the user knows the long press was registered, in line
      // with mobile-music-app conventions (Spotify/Apple Music).
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(12); } catch { /* noop */ }
      }
      setMobileSheetOpen(true);
    }, 500);
  }, [clearLongPressTimer]);

  const handleMobilePressCancel = useCallback(() => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  const handleMobilePressEnd = useCallback(
    (event) => {
      clearLongPressTimer();
      if (longPressFiredRef.current) {
        // Long-press already opened the sheet — swallow the would-be tap so
        // we don't *also* expand the full player.
        event?.preventDefault?.();
        event?.stopPropagation?.();
        longPressFiredRef.current = false;
      }
    },
    [clearLongPressTimer],
  );

  useEffect(() => clearLongPressTimer, [clearLongPressTimer]);
  const isPlayerRoute = location.pathname.startsWith('/player');
  const displayedProgress = seekPreview ?? progress;
  const canSeek = Number.isFinite(duration) && duration > 0;

  useEffect(() => {
    setSeekPreview(null);
  }, [currentTrack?.id]);

  useEffect(() => {
    if (isPlayerRoute && mobileSheetOpen) {
      setMobileSheetOpen(false);
    }
  }, [isPlayerRoute, mobileSheetOpen]);

  const highQualityAudio = settings?.highQualityAudio !== false;
  const safeVideoId = sanitizeVideoId(currentTrack?.videoId);
  const safeThumbnail =
    sanitizeImageUrl(currentTrack?.thumbnail, { fallback: pickPlaceholder('track') })
    || pickPlaceholder('track');

  const handleArtError = (e) => {
    if (e?.currentTarget && e.currentTarget.src !== window.location.origin + pickPlaceholder('track')) {
      e.currentTarget.src = pickPlaceholder('track');
    }
  };

  // The track-accent updates globally so even the sidebar pill and play button
  // reflect the current album art.
  useColorExtraction(safeThumbnail);

  const handleTimeUpdate = useCallback(
    (e) => reportProgress(e.currentTarget?.currentTime),
    [reportProgress],
  );
  const handleDurationChange = useCallback(
    (e) => reportDuration(e.currentTarget?.duration),
    [reportDuration],
  );
  const handleLoadedMetadata = useCallback(
    (e) => reportDuration(e.currentTarget?.duration),
    [reportDuration],
  );
  const handleEnded = useCallback(() => {
    const media = playerRef.current;
    const mediaDuration = Number(media?.duration);
    const endSeconds =
      Number.isFinite(mediaDuration) && mediaDuration > 0
        ? mediaDuration
        : duration;
    if (Number.isFinite(endSeconds) && endSeconds > 0) {
      reportProgress(endSeconds);
    }
    handleTrackEnded();
  }, [playerRef, duration, reportProgress, handleTrackEnded]);
  const playerConfig = useMemo(
    () => ({
      youtube: {
        playerVars: {
          playsinline: 1,
          rel: 0,
          iv_load_policy: 3,
          vq: highQualityAudio ? 'hd1080' : 'auto',
        },
      },
    }),
    [highQualityAudio],
  );

  // Prefer the best quality level YouTube exposes for this video.
  const applyPreferredQuality = useCallback(() => {
    if (!highQualityAudio) return;
    const root = playerRef.current;
    const yt =
      root?.api ||
      (typeof root?.getInternalPlayer === 'function'
        ? root.getInternalPlayer('youtube') || root.getInternalPlayer()
        : null);
    if (!yt) return;

    try {
      const available =
        typeof yt.getAvailableQualityLevels === 'function'
          ? yt.getAvailableQualityLevels()
          : [];
      const preferred =
        QUALITY_PREFERENCE_ORDER.find((level) => available.includes(level)) || 'hd1080';

      if (typeof yt.setPlaybackQualityRange === 'function') {
        yt.setPlaybackQualityRange(preferred);
      }
      if (typeof yt.setPlaybackQuality === 'function') {
        yt.setPlaybackQuality(preferred);
      }
    } catch {
      /* YouTube API is not always ready on first paint */
    }
  }, [highQualityAudio, playerRef]);

  const handlePlayerReady = useCallback(() => {
    applyPreferredQuality();
  }, [applyPreferredQuality]);

  // OS-level / lock-screen / Bluetooth headset controls via Media Session API.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!currentTrack) {
      try {
        navigator.mediaSession.metadata = null;
      } catch {
        /* noop */
      }
      return;
    }
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack.title || 'Untitled',
        artist: currentTrack.artist || 'Unknown artist',
        album: 'Octavia',
        artwork: safeThumbnail
          ? [
              { src: safeThumbnail, sizes: '96x96', type: 'image/jpeg' },
              { src: safeThumbnail, sizes: '256x256', type: 'image/jpeg' },
              { src: safeThumbnail, sizes: '512x512', type: 'image/jpeg' },
            ]
          : [],
      });
    } catch {
      /* MediaMetadata not supported in this browser */
    }
  }, [currentTrack, safeThumbnail]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch {
      /* noop */
    }
  }, [isPlaying]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const safe = (action, handler) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        /* action not supported */
      }
    };

    safe('play', () => togglePlay());
    safe('pause', () => togglePlay());
    safe('previoustrack', () => playPrevious());
    safe('nexttrack', () => playNext());
    safe('seekbackward', (details) => {
      const step = details?.seekOffset || 10;
      seekTo(Math.max(0, (progress || 0) - step));
    });
    safe('seekforward', (details) => {
      const step = details?.seekOffset || 10;
      seekTo(Math.min(duration || 0, (progress || 0) + step));
    });
    safe('seekto', (details) => {
      if (typeof details?.seekTime === 'number') seekTo(details.seekTime);
    });

    return () => {
      ['play', 'pause', 'previoustrack', 'nexttrack', 'seekbackward', 'seekforward', 'seekto'].forEach(
        (a) => safe(a, null),
      );
    };
  }, [togglePlay, playPrevious, playNext, seekTo, progress, duration]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!Number.isFinite(duration) || duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState?.({
        duration,
        position: Math.min(progress || 0, duration),
        playbackRate: 1,
      });
    } catch {
      /* noop */
    }
  }, [progress, duration]);

  useEffect(() => {
    applyPreferredQuality();
  }, [applyPreferredQuality, currentTrack?.id]);

  if (!currentTrack) return null;

  // The track exists but its videoId is missing or unparseable — we cannot
  // play it via YouTube. Show a small, dismissible error footer with a CTA
  // to skip to the next queued track rather than silently rendering nothing.
  if (!safeVideoId) {
    return (
      <AnimatePresence>
        <motion.footer
          key="player-error-footer"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed inset-x-2 bottom-[calc(var(--mobile-nav-height)+var(--mobile-nav-offset)+env(safe-area-inset-bottom)+0.5rem)] phablet:inset-x-auto phablet:bottom-[calc(var(--mobile-nav-height)+var(--mobile-nav-offset)+env(safe-area-inset-bottom)+0.5rem)] lg:bottom-0 phablet:left-[var(--sidebar-w,0px)] phablet:right-0 h-[68px] z-40 glass-strong border border-warning/30 phablet:border-x-0 phablet:border-b-0 flex items-center px-4 phablet:px-5 gap-3 phablet:gap-4 rounded-soft phablet:rounded-none"
          role="alert"
        >
          <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
          <div className="flex-1 min-w-0 leading-tight">
            <p className="text-[13px] text-ink truncate">
              <span className="font-medium">Can't play this track.</span>{' '}
              <span className="text-ink-3">The source is unavailable.</span>
            </p>
            <p className="text-[11.5px] text-ink-4 truncate mt-0.5">
              {currentTrack.title}
              {currentTrack.artist ? ` \u00b7 ${currentTrack.artist}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={playNext}
            disabled={!canGoNext}
            className="h-9 px-4 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 hover:border-white/25 text-ink text-[12.5px] font-medium focus-ring transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Try next
          </button>
        </motion.footer>
      </AnimatePresence>
    );
  }

  return (
    <>
      <Suspense fallback={null}>
        <ReactPlayer
          ref={playerRef}
          src={`https://www.youtube.com/watch?v=${safeVideoId}`}
          playing={isPlaying}
          // `fadeGain` modulates volume during the last `crossfadeSeconds`
          // of a track and ramps from 0 → 1 at the start. When the setting
          // is 0 it stays pinned at 1, so user volume is unaffected.
          volume={Math.max(0, Math.min(1, volume * (isMuted ? 0 : fadeGain)))}
          config={playerConfig}
          onReady={handlePlayerReady}
          onTimeUpdate={handleTimeUpdate}
          onDurationChange={handleDurationChange}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          width="0"
          height="0"
          style={{ display: 'none' }}
        />
      </Suspense>

      <AnimatePresence>
        {/* Desktop / tablet footer */}
        {!isPlayerRoute ? (
        <motion.footer
          key="desktop-footer"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="player-footer-desktop hidden phablet:flex fixed bottom-[calc(var(--mobile-nav-height)+var(--mobile-nav-offset)+env(safe-area-inset-bottom,0px)+0.5rem)] lg:bottom-0 right-0 h-[var(--desktop-footer-height)] glass-strong z-40 transition-[left,bottom] duration-med ease-emphasis border-t border-white/[0.06]"
          style={{
            left: 'var(--sidebar-w, 0px)',
            // Rim-light along the top edge so the footer reads as a
            // physical surface lifting off the page, not a flat band.
            boxShadow:
              'inset 0 1px 0 hsl(var(--ink-primary) / 0.07), 0 -2px 24px rgba(0,0,0,0.32)',
          }}
        >
          {/* Multi-hue bloom that picks up the rotating accents — anchored
              left and right so the bottom edge always glows with two
              coordinated colours instead of a single warm ember. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none opacity-60"
            style={{
              background:
                'radial-gradient(ellipse 30% 80% at 0% 50%, hsl(var(--track-accent) / 0.12), transparent 70%), radial-gradient(ellipse 28% 70% at 100% 50%, hsl(var(--track-accent-3) / 0.10), transparent 72%), radial-gradient(ellipse 40% 60% at 50% 110%, hsl(var(--track-accent-2) / 0.08), transparent 70%)',
            }}
          />
          {/* Hairline along the top edge — a three-stop shimmer that ties the
              footer back into the rotating accent system. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px"
            style={{
              backgroundImage:
                'linear-gradient(90deg, transparent 0%, hsl(var(--track-accent) / 0.55) 25%, hsl(var(--track-accent-2) / 0.7) 50%, hsl(var(--track-accent-3) / 0.55) 75%, transparent 100%)',
            }}
          />
          <div className="player-footer-inner relative flex h-full w-full items-center gap-2.5 px-3 md:gap-3 md:px-4 lg:gap-7 lg:px-7">
            <div className="player-desktop-left flex min-w-0 shrink items-center gap-2 md:basis-[38%] lg:basis-auto lg:gap-4 lg:w-72">
              <button
                type="button"
                onClick={() => navigate('/player')}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-sharp p-1 text-left transition-colors focus-ring hover:bg-white/[0.04] lg:gap-3"
                aria-label="Open now playing page"
              >
                {/* Album thumb wrapped in a thin progress ring — the single
                    timeline language carries from /player into the footer.
                    Scrubbing happens by tapping the thumb to open /player. */}
                <ProgressRing
                  progress={displayedProgress}
                  duration={duration}
                  playing={isPlaying}
                  startAt="left"
                  thickness={2.2}
                  size={60}
                  className="flex-shrink-0"
                  innerClassName="p-[10%]"
                >
                  <motion.img
                    layoutId="footer-art-desktop"
                    key={currentTrack.id}
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    src={safeThumbnail}
                    alt={currentTrack.title || ''}
                    onError={handleArtError}
                    loading="eager"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    style={{ viewTransitionName: 'vt-now-cover' }}
                    className="h-full w-full rounded-[28%] object-cover"
                  />
                </ProgressRing>
                <div className="min-w-0 flex-1">
                  <h4
                    className={cn(
                      'font-display text-[15px] leading-tight truncate text-ink tracking-tight',
                      // Pulse the title while we're waiting for the first
                      // frame so the UI clearly says "I heard you, hang on".
                      isBuffering && 'animate-pulse opacity-80',
                    )}
                  >
                    {currentTrack.title}
                  </h4>
                  <p className="text-[11.5px] text-ink-3 truncate mt-1 leading-tight">
                    <span className="font-editorial">by</span> {currentTrack.artist || 'Unknown artist'}
                  </p>
                </div>
              </button>
              <HeartButton track={currentTrack} size="sm" className="hidden lg:inline-flex" />
              <AddToPlaylistButton
                track={currentTrack}
                className="hidden lg:inline-flex p-2"
                align="start"
                side="top"
                sideOffset={12}
              />
            </div>

            <div className="player-desktop-center flex min-w-0 flex-col items-center gap-1.5 md:basis-[44%] lg:flex-1 lg:basis-auto">
              <div className="flex items-center gap-2.5 lg:gap-4">
                <motion.button
                  type="button"
                  whileHover={reduceMotion ? undefined : { scale: 1.02 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                  onClick={transport.onToggleShuffle}
                  className={cn(
                    'hidden rounded-full p-2 transition-colors focus-ring lg:inline-flex',
                    shuffle ? 'text-accent' : 'text-ink-3 hover:text-ink',
                  )}
                  aria-label={transport.labels.shuffle}
                  aria-pressed={shuffle}
                >
                  <Shuffle className="w-4 h-4" />
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={reduceMotion || !canGoPrevious ? undefined : { scale: 0.92 }}
                  onClick={transport.onPlayPrevious}
                  disabled={!canGoPrevious}
                  className="p-2 text-ink-3 hover:text-ink transition-colors focus-ring rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={transport.labels.previous}
                >
                  <SkipBack className="h-4 w-4 lg:h-5 lg:w-5" />
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={reduceMotion ? undefined : { scale: 1.04 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                  onClick={transport.onTogglePlay}
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-full text-track-fg ring-1 ring-white/15 shadow-accent focus-premium gradient-accent lg:h-12 lg:w-12',
                    // Subtle pulse glow when playing — sells "live, breathing"
                    // without being noisy. Off entirely when paused.
                    isPlaying && 'pulse-glow',
                  )}
                  aria-label={transport.labels.play}
                  aria-pressed={isPlaying}
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 30% 25%, hsl(var(--ink-primary) / 0.26), transparent 55%), linear-gradient(135deg, hsl(var(--track-accent)), hsl(var(--track-accent-strong)))',
                    boxShadow: isPlaying
                      ? 'inset 0 1px 0 hsl(var(--ink-primary)/0.30), 0 6px 18px hsl(var(--track-accent)/0.45), 0 0 0 1px hsl(var(--ink-primary)/0.10)'
                      : 'inset 0 1px 0 hsl(var(--ink-primary)/0.22), 0 4px 12px hsl(var(--track-accent)/0.28), 0 0 0 1px hsl(var(--ink-primary)/0.08)',
                  }}
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4 fill-current lg:h-[18px] lg:w-[18px]" />
                  ) : (
                    <Play className="ml-0.5 h-4 w-4 fill-current lg:h-[18px] lg:w-[18px]" />
                  )}
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={reduceMotion || !canGoNext ? undefined : { scale: 0.92 }}
                  onClick={transport.onPlayNext}
                  disabled={!canGoNext}
                  className="p-2 text-ink-3 hover:text-ink transition-colors focus-ring rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label={transport.labels.next}
                >
                  <SkipForward className="h-4 w-4 lg:h-5 lg:w-5" />
                </motion.button>
                <motion.button
                  type="button"
                  whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                  onClick={transport.onToggleRepeat}
                  className={cn(
                    'relative hidden rounded-full p-2 transition-colors focus-ring lg:inline-flex',
                    repeat !== 'off'
                      ? 'text-accent'
                      : 'text-ink-3 hover:text-ink',
                  )}
                  aria-label={transport.labels.repeat}
                  aria-pressed={repeat !== 'off'}
                >
                  {repeat === 'one' ? (
                    <Repeat1 className="w-4 h-4" />
                  ) : (
                    <Repeat className="w-4 h-4" />
                  )}
                  {/* Tiny "1" badge so the repeat-one state is unmistakable
                      even at the small footer scale. */}
                  {repeat === 'one' ? (
                    <span
                      aria-hidden="true"
                      className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full text-[9px] font-mono font-semibold bg-accent text-track-fg leading-none"
                    >
                      1
                    </span>
                  ) : null}
                </motion.button>
              </div>

              {/* Linear seek bar — the ring around the artwork is still the
                  primary "you are here" indicator, but a slim interactive
                  bar gives quick random-access scrubbing without leaving
                  the footer. The Slider's range fills with the runtime
                  --track-accent gradient, so it tracks the same chameleon
                  palette as the ring and the play button. */}
              <div
                className={cn(
                  'flex w-full max-w-[460px] items-center gap-2.5 lg:max-w-[520px] xl:max-w-[620px]',
                  isBuffering && 'animate-pulse',
                )}
              >
                <span className="hidden w-10 shrink-0 text-right font-mono text-[10.5px] tabular tracking-tight text-ink-3 lg:block">
                  {formatTime(displayedProgress)}
                </span>
                <Slider
                  value={[Math.min(displayedProgress || 0, duration || 0)]}
                  max={duration > 0 ? duration : 100}
                  step={1}
                  onValueChange={(value) => setSeekPreview(value[0])}
                  onValueCommit={(value) => {
                    setSeekPreview(null);
                    seekTo(value[0]);
                  }}
                  disabled={!canSeek}
                  // Delicate-then-tactile thickness: hairline at rest,
                  // bumps to 4px on hover / focus-within so the affordance
                  // is unmistakable without crowding the footer chrome.
                  className="flex-1 [&_.slider-track]:h-[2px] [&_.slider-track]:transition-[height] [&_.slider-track]:duration-med [&_.slider-track]:ease-emphasis hover:[&_.slider-track]:h-[4px] focus-within:[&_.slider-track]:h-[4px]"
                  aria-label="Seek"
                />
                <span className="hidden w-10 shrink-0 font-mono text-[10.5px] tabular tracking-tight text-ink-4 lg:block">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            <div className="player-desktop-right flex min-w-0 items-center justify-end gap-1 md:basis-[18%] lg:basis-auto lg:gap-3 lg:w-48">
              <button
                onClick={toggleMute}
                className="touch-target text-ink-3 hover:text-ink transition-colors focus-ring rounded-full p-1"
                aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <Slider
                value={[volume * 100]}
                max={100}
                step={1}
                onValueChange={(value) => setVolume(value[0] / 100)}
                // Same delicate-then-tactile treatment as the seek bar.
                className="min-w-[72px] flex-1 [&_.slider-track]:h-[2px] [&_.slider-track]:transition-[height] [&_.slider-track]:duration-med [&_.slider-track]:ease-emphasis hover:[&_.slider-track]:h-[4px] focus-within:[&_.slider-track]:h-[4px]"
                aria-label="Volume"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="touch-target relative p-2 rounded-full text-ink-3 hover:text-ink hover:bg-white/5 transition-colors focus-ring"
                    aria-label="Show queue"
                  >
                    <ListMusic className="w-4 h-4" />
                    {/* Tiny count chip so users know the depth without
                        opening the popover. */}
                    {queue && queue.length > 0 ? (
                      <span
                        aria-hidden="true"
                        className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full text-[9px] font-mono font-semibold bg-track/85 text-track-fg leading-none"
                      >
                        {queue.length > 99 ? '99+' : queue.length}
                      </span>
                    ) : null}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  side="top"
                  sideOffset={12}
                  className="w-[min(22rem,calc(100vw-1rem))] sm:w-[min(22rem,calc(100vw-2rem))] p-0 bg-surface-1/95 backdrop-blur-xl border-white/[0.08]"
                >
                  <div className="px-4 pt-3 pb-2 border-b border-white/[0.06] flex items-center justify-between">
                    <p className="eyebrow text-ink-3">Queue</p>
                    <button
                      type="button"
                      onClick={() => navigate('/player?panel=queue')}
                      className="text-[11px] font-mono uppercase tracking-[0.18em] text-ink-3 hover:text-ink focus-ring rounded-sharp px-1.5 py-0.5"
                    >
                      Open player
                    </button>
                  </div>
                  <div data-lenis-prevent className="max-h-[400px] overflow-y-auto custom-scrollbar p-2">
                    <QueuePanel />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </motion.footer>
        ) : null}

        {/* Mobile compact footer */}
        {!isPlayerRoute ? (
          <motion.div
            key="mobile-footer"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="player-footer-mobile phablet:hidden fixed inset-x-2 z-40 h-[var(--mobile-mini-height)] rounded-soft glass-strong overflow-hidden ring-1 ring-white/[0.06]"
            style={{
              bottom:
                'calc(var(--mobile-nav-height) + var(--mobile-nav-offset) + env(safe-area-inset-bottom, 0px) + var(--mobile-mini-gap))',
              // Same rim-light vocabulary as the desktop footer.
              boxShadow:
                'inset 0 1px 0 hsl(var(--ink-primary) / 0.07), var(--shadow-3)',
            }}
          >
            {/* Slim progress strip along the bottom edge. The entire tile
                is a tap-to-open-/player target, so this strip is purely
                informational — interactive scrubbing lives on the full
                player page. The fill uses the same chameleon gradient as
                the ring and the desktop seek bar. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-white/[0.06]"
            >
              <span
                className={cn(
                  'block h-full transition-[width] duration-150 ease-linear',
                  isBuffering && 'animate-pulse',
                )}
                style={{
                  width: `${
                    Number.isFinite(duration) && duration > 0
                      ? Math.min(100, Math.max(0, ((progress || 0) / duration) * 100))
                      : 0
                  }%`,
                  backgroundImage:
                    'linear-gradient(90deg, hsl(var(--track-accent)), hsl(var(--track-accent-strong)))',
                }}
              />
            </span>
            <button
              type="button"
              onClick={(e) => {
                if (longPressFiredRef.current) {
                  // Long press already opened the sheet — don't *also* navigate.
                  e.preventDefault();
                  return;
                }
                navigate('/player');
              }}
              onPointerDown={handleMobilePressStart}
              onPointerUp={handleMobilePressEnd}
              onPointerCancel={handleMobilePressCancel}
              onPointerLeave={handleMobilePressCancel}
              onContextMenu={(e) => e.preventDefault()}
              className="absolute inset-0 flex items-center pl-2 pr-16 gap-3 text-left focus-ring"
              aria-label="Open now playing page (long-press for quick actions)"
            >
              {/* Mobile mini — same ring vocabulary as desktop, just smaller.
                  Replaces the old bottom-edge progress strip; the ring IS
                  the progress now. */}
              <ProgressRing
                progress={progress}
                duration={duration}
                playing={isPlaying}
                startAt="left"
                thickness={2.2}
                size={56}
                className="flex-shrink-0"
                innerClassName="p-[10%]"
              >
                <motion.img
                  layoutId="footer-art-mobile"
                  key={currentTrack.id}
                  src={safeThumbnail}
                  alt={currentTrack.title || ''}
                  onError={handleArtError}
                  loading="eager"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  style={{ viewTransitionName: 'vt-now-cover' }}
                  className="h-full w-full rounded-[28%] object-cover"
                />
              </ProgressRing>
              <div className="flex-1 min-w-0">
                <p className="font-display text-[15px] leading-tight truncate text-ink tracking-tight">
                  {currentTrack.title}
                </p>
                <p className="text-[11.5px] text-ink-3 truncate mt-1 leading-tight">
                  <span className="font-editorial">by</span> {currentTrack.artist || 'Unknown artist'}
                </p>
              </div>
            </button>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  transport.onTogglePlay();
                }}
                className="w-11 h-11 rounded-full gradient-accent text-track-fg flex items-center justify-center shadow-accent focus-ring ring-1 ring-white/15"
                aria-label={transport.labels.play}
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 30% 25%, hsl(var(--ink-primary) / 0.22), transparent 55%), linear-gradient(135deg, hsl(var(--track-accent)), hsl(var(--track-accent-strong)))',
                }}
              >
                {isPlaying ? (
                  <Pause className="w-[18px] h-[18px] fill-current" />
                ) : (
                  <Play className="w-[18px] h-[18px] fill-current ml-0.5" />
                )}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      <MobileMiniPlayerSheet
        open={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
      />
    </>
  );
};

export default FooterPlayer;
