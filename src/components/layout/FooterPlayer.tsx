import { usePlayer } from '@/contexts/PlayerContext';
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
  Repeat1
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { motion, AnimatePresence } from 'framer-motion';
import { SyntheticEvent, useCallback, useEffect, useState } from 'react';

const FooterPlayer = () => {
  const {
    currentTrack,
    isPlaying,
    volume,
    togglePlay,
    setVolume,
    seekTo,
    playNext,
    playPrevious,
    shuffle,
    toggleShuffle,
    repeat,
    toggleRepeat,
    playerRef,
  } = usePlayer();

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    seekTo(value[0]);
  };

  const handleEnded = () => {
    if (repeat === 'one') {
      seekTo(0);
    } else {
      playNext();
    }
  };

  const handleTimeUpdate = useCallback((e: SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    setProgress(video.currentTime);
  }, []);

  const handleDurationChange = useCallback((e: SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    setDuration(video.duration || 0);
  }, []);

  const handleLoadedMetadata = useCallback((e: SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    setDuration(video.duration || 0);
  }, []);

  if (!currentTrack) return null;

  return (
    <>
      {/* Hidden ReactPlayer for audio playback */}
      <ReactPlayer
        ref={playerRef}
        src={`https://www.youtube.com/watch?v=${currentTrack.videoId}`}
        playing={isPlaying}
        volume={volume}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={handleDurationChange}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        width="0"
        height="0"
        style={{ display: 'none' }}
      />

      {/* Footer Player UI */}
      <AnimatePresence>
        <motion.footer
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-20 right-0 h-24 glass-strong z-40"
        >
          <div className="h-full flex items-center px-6 gap-6">
            {/* Track Info */}
            <div className="flex items-center gap-4 w-72">
              <motion.img
                key={currentTrack.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-14 h-14 rounded-lg object-cover shadow-lg"
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate">{currentTrack.title}</h4>
                <p className="text-xs text-muted-foreground truncate">{currentTrack.artist}</p>
              </div>
            </div>

            {/* Player Controls */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleShuffle}
                  className={`p-2 rounded-full transition-colors ${shuffle ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Shuffle className="w-4 h-4" />
                </button>
                <button
                  onClick={playPrevious}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full bg-gradient-to-r from-primary to-orange-400 flex items-center justify-center shadow-lg shadow-primary/30"
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-primary-foreground" />
                  ) : (
                    <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                  )}
                </motion.button>
                <button
                  onClick={playNext}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
                <button
                  onClick={toggleRepeat}
                  className={`p-2 rounded-full transition-colors ${repeat !== 'off' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-xl flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-10 text-right">
                  {formatTime(progress)}
                </span>
                <Slider
                  value={[progress]}
                  max={duration || 100}
                  step={1}
                  onValueChange={handleSeek}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground w-10">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-3 w-40">
              <button
                onClick={() => setVolume(volume === 0 ? 0.7 : 0)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <Slider
                value={[volume * 100]}
                max={100}
                step={1}
                onValueChange={(value) => setVolume(value[0] / 100)}
                className="flex-1"
              />
            </div>
          </div>
        </motion.footer>
      </AnimatePresence>
    </>
  );
};

export default FooterPlayer;
