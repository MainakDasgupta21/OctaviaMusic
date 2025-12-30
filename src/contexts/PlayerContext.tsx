import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

export interface Track {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: string;
}

interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  volume: number;
  progress: number;
  duration: number;
  queue: Track[];
  playTrack: (track: Track) => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  seekTo: (seconds: number) => void;
  addToQueue: (track: Track) => void;
  playNext: () => void;
  playPrevious: () => void;
  shuffle: boolean;
  toggleShuffle: () => void;
  repeat: 'off' | 'one' | 'all';
  toggleRepeat: () => void;
  playerRef: React.MutableRefObject<any>;
  onProgress: (state: { played: number; playedSeconds: number }) => void;
  onDuration: (duration: number) => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.7);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState<Track[]>([]);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'off' | 'one' | 'all'>('off');
  const playerRef = useRef<any>(null);

  const playTrack = useCallback((track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds, 'seconds');
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueue(prev => [...prev, track]);
  }, []);

  const playNext = useCallback(() => {
    if (queue.length > 0) {
      const nextIndex = shuffle ? Math.floor(Math.random() * queue.length) : 0;
      const nextTrack = queue[nextIndex];
      setQueue(prev => prev.filter((_, i) => i !== nextIndex));
      setCurrentTrack(nextTrack);
      setIsPlaying(true);
      setProgress(0);
    }
  }, [queue, shuffle]);

  const playPrevious = useCallback(() => {
    playerRef.current?.seekTo(0, 'seconds');
  }, []);

  const toggleShuffle = useCallback(() => {
    setShuffle(prev => !prev);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeat(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  }, []);

  const onProgress = useCallback((state: { played: number; playedSeconds: number }) => {
    setProgress(state.playedSeconds);
  }, []);

  const onDuration = useCallback((dur: number) => {
    setDuration(dur);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        isPlaying,
        volume,
        progress,
        duration,
        queue,
        playTrack,
        togglePlay,
        setVolume,
        seekTo,
        addToQueue,
        playNext,
        playPrevious,
        shuffle,
        toggleShuffle,
        repeat,
        toggleRepeat,
        playerRef,
        onProgress,
        onDuration,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
};
