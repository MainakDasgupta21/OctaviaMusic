import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const PlayerContext = createContext(undefined);

export const PlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.7);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [queue, setQueue] = useState([]);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off');
  const playerRef = useRef(null);

  const playTrack = useCallback((track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const setVolume = useCallback((vol) => {
    setVolumeState(vol);
  }, []);

  const seekTo = useCallback((seconds) => {
    playerRef.current?.seekTo(seconds, 'seconds');
  }, []);

  const addToQueue = useCallback((track) => {
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

  const onProgress = useCallback((state) => {
    setProgress(state.playedSeconds);
  }, []);

  const onDuration = useCallback((dur) => {
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