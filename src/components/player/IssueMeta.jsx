import { ChevronDown, ExternalLink } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';

// Variant chrome for the now-playing surface.
const IssueMeta = ({ variant = 'page', onMinimize, onOpenFull }) => {
  const { currentTrack } = usePlayer();

  if (!currentTrack) return null;

  if (variant === 'overlay') {
    return (
      <div className="relative z-10 flex items-center justify-between px-5 md:px-7 py-3.5 border-b border-white/[0.08] flex-shrink-0">
        <button
          type="button"
          onClick={onMinimize}
          className="flex items-center gap-2 text-sm text-ink-3 hover:text-ink transition-colors focus-ring rounded-lg px-2 py-1"
        >
          <ChevronDown className="w-4 h-4" />
          Minimize
        </button>
        <div className="text-center hidden md:block px-4 min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-4">Now playing</p>
          <p className="font-display text-[16px] text-ink truncate max-w-[34rem] mx-auto mt-1">
            {currentTrack.title}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenFull}
          className="flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink transition-colors focus-ring rounded-lg px-2 py-1"
        >
          Open full page
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="hidden md:grid shrink-0 grid-cols-3 items-center mb-4 pb-3 border-b border-white/[0.08]"
    >
      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-ink-4">Now playing</span>
      <span className="justify-self-center text-[10px] font-mono uppercase tracking-[0.16em] text-track">
        {currentTrack.artist || 'Unknown artist'}
      </span>
      <span className="justify-self-end inline-flex items-center rounded-full border border-white/[0.12] bg-white/[0.03] px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.12em] text-ink-3">
        {currentTrack.album || 'Single'}
      </span>
    </div>
  );
};

export default IssueMeta;
