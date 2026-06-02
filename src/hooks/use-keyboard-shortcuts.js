import { useEffect } from 'react';
import { toast } from 'sonner';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useUI } from '@/contexts/UIContext';

const isEditable = (el) => {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
};

const SEEK_STEP = 5;

export const useKeyboardShortcuts = () => {
  const {
    currentTrack,
    isPlaying,
    togglePlay,
    seekTo,
    progress,
    duration,
    playNext,
    playPrevious,
    toggleMute,
    isMuted,
  } = usePlayer();
  const { toggleFavorite, isFavorite } = useFavorites();
  const {
    togglePalette,
    closePalette,
    closeExpandedPlayer,
    closeMobileDrawer,
    focusGlobalSearch,
    paletteOpen,
    expandedPlayerOpen,
    mobileDrawerOpen,
  } = useUI();

  useEffect(() => {
    const onKey = (e) => {
      // Always handle Cmd/Ctrl+K and Esc, even from inputs
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        togglePalette();
        return;
      }
      if (e.key === 'Escape') {
        if (paletteOpen) {
          closePalette();
          return;
        }
        if (expandedPlayerOpen) {
          closeExpandedPlayer();
          return;
        }
        if (mobileDrawerOpen) {
          closeMobileDrawer();
          return;
        }
      }

      // Everything below is suppressed while typing in inputs
      if (isEditable(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case ' ':
        case 'Spacebar': {
          if (!currentTrack) return;
          e.preventDefault();
          togglePlay();
          toast(isPlaying ? 'Paused' : 'Playing', { duration: 1100 });
          break;
        }
        case 'ArrowLeft': {
          if (!currentTrack) return;
          if (e.shiftKey) {
            e.preventDefault();
            playPrevious();
          } else {
            e.preventDefault();
            seekTo(Math.max(0, (progress || 0) - SEEK_STEP));
          }
          break;
        }
        case 'ArrowRight': {
          if (!currentTrack) return;
          if (e.shiftKey) {
            e.preventDefault();
            playNext();
          } else {
            e.preventDefault();
            seekTo(Math.min(duration || 0, (progress || 0) + SEEK_STEP));
          }
          break;
        }
        case 'm':
        case 'M': {
          e.preventDefault();
          toggleMute();
          toast(isMuted ? 'Unmuted' : 'Muted', { duration: 1100 });
          break;
        }
        case 'l':
        case 'L': {
          if (!currentTrack) return;
          e.preventDefault();
          const wasAdded = toggleFavorite(currentTrack);
          toast(wasAdded ? 'Added to favorites' : 'Removed from favorites', {
            description: currentTrack.title,
          });
          break;
        }
        case '/': {
          e.preventDefault();
          focusGlobalSearch();
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    currentTrack,
    isPlaying,
    togglePlay,
    seekTo,
    progress,
    duration,
    playNext,
    playPrevious,
    toggleMute,
    isMuted,
    toggleFavorite,
    isFavorite,
    togglePalette,
    closePalette,
    closeExpandedPlayer,
    closeMobileDrawer,
    focusGlobalSearch,
    paletteOpen,
    expandedPlayerOpen,
    mobileDrawerOpen,
  ]);
};
