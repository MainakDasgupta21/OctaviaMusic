import { useCallback, useEffect } from 'react';
import { usePlayer, usePlayerProgress } from '@/contexts/PlayerContext';
import { useUI } from '@/contexts/UIContext';
import ReactPlayer from 'react-player';
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
  Maximize2,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { motion, AnimatePresence } from 'framer-motion';
import HeartButton from '@/components/HeartButton';
import { useColorExtraction } from '@/hooks/use-color-extraction';
import { cn } from '@/lib/utils';

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

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
    toggleShuffle,
    repeat,
    toggleRepeat,
    playerRef,
    reportProgress,
    reportDuration,
    handleTrackEnded,
    canGoNext,
  } = usePlayer();
  const { progress, duration, canGoPrevious } = usePlayerProgress();
  const { openExpandedPlayer } = useUI();

  // The track-accent updates globally so even the sidebar pill and play button
  // reflect the current album art.
  useColorExtraction(currentTrack?.thumbnail);

  const handleSeek = (value) => seekTo(value[0]);

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
        album: 'Harmony Hub',
        artwork: currentTrack.thumbnail
          ? [
              { src: currentTrack.thumbnail, sizes: '96x96', type: 'image/jpeg' },
              { src: currentTrack.thumbnail, sizes: '256x256', type: 'image/jpeg' },
              { src: currentTrack.thumbnail, sizes: '512x512', type: 'image/jpeg' },
            ]
          : [],
      });
    } catch {
      /* MediaMetadata not supported in this browser */
    }
  }, [currentTrack]);

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

  if (!currentTrack) return null;

  return (
    <>
      <ReactPlayer
        ref={playerRef}
        src={`https://www.youtube.com/watch?v=${currentTrack.videoId}`}
        playing={isPlaying}
        volume={volume}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleTrackEnded}
        width="0"
        height="0"
        style={{ display: 'none' }}
      />

      <AnimatePresence>
        {/* Desktop / tablet footer */}
        <motion.footer
          key="desktop-footer"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="hidden md:flex fixed bottom-0 right-0 h-[100px] glass-strong z-40 transition-[left] duration-med ease-emphasis border-t border-white/[0.06]"
          style={{ left: 'var(--sidebar-w, 80px)' }}
        >
          {/* Subtle ember bloom that picks up the track accent */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none opacity-50"
            style={{
              background: 'radial-gradient(ellipse 30% 80% at 0% 50%, hsl(var(--track-accent) / 0.10), transparent 70%)',
            }}
          />
          <div className="relative w-full h-full flex items-center px-7 gap-7">
            <div className="flex items-center gap-4 w-72 min-w-0">
              <button
                type="button"
                onClick={openExpandedPlayer}
                className="flex items-center gap-3 min-w-0 flex-1 text-left focus-ring rounded-sharp p-1 -m-1 hover:bg-white/[0.04] transition-colors"
                aria-label="Expand now playing"
              >
                <motion.img
                  layoutId="footer-art"
                  key={currentTrack.id}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-14 h-14 rounded-sharp object-cover ring-1 ring-white/10 shadow-elev-2 flex-shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-display text-[15px] leading-tight truncate text-ink">
                    {currentTrack.title}
                  </h4>
                  <p className="text-[11px] text-ink-3 truncate mt-0.5">
                    <span className="font-editorial">by</span> {currentTrack.artist}
                  </p>
                </div>
              </button>
              <HeartButton track={currentTrack} size="sm" />
            </div>

            <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleShuffle}
                  className={cn(
                    'p-2 rounded-full transition-colors focus-ring',
                    shuffle ? 'text-accent' : 'text-ink-3 hover:text-ink',
                  )}
                  aria-label="Toggle shuffle"
                  aria-pressed={shuffle}
                >
                  <Shuffle className="w-4 h-4" />
                </button>
                <button
                  onClick={playPrevious}
                  disabled={!canGoPrevious}
                  className="p-2 text-ink-3 hover:text-ink transition-colors focus-ring rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={togglePlay}
                  className="relative w-12 h-12 rounded-full gradient-accent text-track-fg flex items-center justify-center shadow-accent focus-ring ring-1 ring-white/15"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
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
                </motion.button>
                <button
                  onClick={playNext}
                  disabled={!canGoNext}
                  className="p-2 text-ink-3 hover:text-ink transition-colors focus-ring rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
                <button
                  onClick={toggleRepeat}
                  className={cn(
                    'p-2 rounded-full transition-colors focus-ring',
                    repeat !== 'off'
                      ? 'text-accent'
                      : 'text-ink-3 hover:text-ink',
                  )}
                  aria-label={
                    repeat === 'one'
                      ? 'Repeat one'
                      : repeat === 'all'
                        ? 'Repeat all'
                        : 'Repeat off'
                  }
                  aria-pressed={repeat !== 'off'}
                >
                  {repeat === 'one' ? (
                    <Repeat1 className="w-4 h-4" />
                  ) : (
                    <Repeat className="w-4 h-4" />
                  )}
                </button>
              </div>

              <div className="w-full max-w-xl flex items-center gap-3">
                <span className="text-[10.5px] font-mono text-ink-3 w-10 text-right tabular-nums tracking-tight">
                  {formatTime(progress)}
                </span>
                <Slider
                  value={[progress]}
                  max={duration || 100}
                  step={1}
                  onValueChange={handleSeek}
                  className="flex-1"
                  aria-label="Seek"
                />
                <span className="text-[10.5px] font-mono text-ink-4 w-10 tabular-nums tracking-tight">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-48">
              <button
                onClick={toggleMute}
                className="text-ink-3 hover:text-ink transition-colors focus-ring rounded-full p-1"
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
                className="flex-1"
                aria-label="Volume"
              />
              <button
                onClick={openExpandedPlayer}
                className="p-2 rounded-full text-ink-3 hover:text-ink hover:bg-white/5 transition-colors focus-ring"
                aria-label="Expand player"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.footer>

        {/* Mobile compact footer */}
        <motion.div
          key="mobile-footer"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="md:hidden fixed inset-x-2 bottom-[5.25rem] z-40 h-16 rounded-soft glass-strong overflow-hidden ring-1 ring-white/[0.06] shadow-elev-3"
        >
          <button
            type="button"
            onClick={openExpandedPlayer}
            className="absolute inset-0 flex items-center pl-2 pr-16 gap-3 text-left focus-ring"
            aria-label="Expand now playing"
          >
            <motion.img
              layoutId="footer-art-mobile"
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className="w-12 h-12 rounded-sharp object-cover ring-1 ring-white/10 flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-display text-[15px] leading-tight truncate text-ink">
                {currentTrack.title}
              </p>
              <p className="text-[11px] text-ink-3 truncate mt-0.5">
                <span className="font-editorial">by</span> {currentTrack.artist}
              </p>
            </div>
          </button>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="w-11 h-11 rounded-full gradient-accent text-track-fg flex items-center justify-center shadow-accent focus-ring ring-1 ring-white/15"
              aria-label={isPlaying ? 'Pause' : 'Play'}
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
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/[0.08]">
            <div
              className="h-full bg-track transition-[width] duration-300 ease-out"
              style={{
                width: `${
                  duration > 0 ? Math.min(100, (progress / duration) * 100) : 0
                }%`,
                boxShadow: '0 0 8px hsl(var(--track-accent) / 0.6)',
              }}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default FooterPlayer;
