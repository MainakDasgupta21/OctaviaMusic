import { useEffect, useState } from 'react';
import { usePlayer } from '@/contexts/PlayerContext';

// Visually hidden live region that announces the currently playing track to
// screen readers. Keeps the WCAG "status" criterion happy without overlaying
// the visual UI.
const PlayerAnnouncer = () => {
  const { currentTrack, isPlaying } = usePlayer();
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!currentTrack) return;
    setMsg(`${isPlaying ? 'Playing' : 'Paused'} \u2014 ${currentTrack.title} by ${currentTrack.artist}`);
  }, [currentTrack?.id, isPlaying, currentTrack]);

  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {msg}
    </div>
  );
};

export default PlayerAnnouncer;
