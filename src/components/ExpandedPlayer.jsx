import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayer } from '@/contexts/PlayerContext';
import { useUI } from '@/contexts/UIContext';
import { isReducedMotion } from '@/design/motion';
import NowPlaying from '@/components/player/NowPlaying';

// Thin overlay wrapper: the modal shell (slide-up sheet, backdrop, dialog
// semantics, ESC-to-close) around the canonical now-playing surface.
const ExpandedPlayer = () => {
  const navigate = useNavigate();
  const { expandedPlayerOpen, closeExpandedPlayer } = useUI();
  const { currentTrack } = usePlayer();
  const reduceMotion = isReducedMotion();

  useEffect(() => {
    if (!expandedPlayerOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeExpandedPlayer();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expandedPlayerOpen, closeExpandedPlayer]);

  const handleOpenFull = () => {
    closeExpandedPlayer();
    navigate('/player');
  };

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
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 280, damping: 32 }}
            className="relative w-full h-full overflow-hidden flex flex-col bg-[hsl(var(--surface-0))]"
          >
            <NowPlaying variant="overlay" onMinimize={closeExpandedPlayer} onOpenFull={handleOpenFull} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ExpandedPlayer;
