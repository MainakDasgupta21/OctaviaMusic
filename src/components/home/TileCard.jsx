import { useCallback } from 'react';
import { Play } from 'lucide-react';
import Skeleton from '@/components/ui-v2/Skeleton';
import SmartImage from '@/components/SmartImage';
import { useSounds } from '@/contexts/SoundContext';

const NowPlayingChip = () => (
  <span className="inline-flex items-end gap-0.5 h-4" aria-label="Now playing">
    <span className="w-0.5 h-2 bg-accent rounded-full animate-pulse" />
    <span
      className="w-0.5 h-3 bg-accent rounded-full animate-pulse"
      style={{ animationDelay: '0.12s' }}
    />
    <span
      className="w-0.5 h-1.5 bg-accent rounded-full animate-pulse"
      style={{ animationDelay: '0.24s' }}
    />
  </span>
);

const TileCard = ({ track, onPlay, isCurrent, index }) => {
  const { play: playSfx } = useSounds();

  // Wrap the consumer's onPlay with a satisfying tap: pop sfx + a tiny haptic
  // tick on mobile (SoundContext falls back to navigator.vibrate when SFX are
  // muted). The view-transition-name on the cover lets the thumbnail morph
  // smoothly into the player hero on the next page.
  const handleClick = useCallback(
    (event) => {
      playSfx('pop');
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try { navigator.vibrate(6); } catch { /* noop */ }
      }
      if (typeof onPlay === 'function') onPlay(event);
    },
    [onPlay, playSfx],
  );

  return (
  <button
    type="button"
    onClick={handleClick}
    className="relative group flex-shrink-0 w-44 snap-start snap-pop text-left focus-ring rounded-sharp lift press"
  >
    <div
      className="relative aspect-square rounded-sharp overflow-hidden card-magnetic"
      style={{
        // Card-premium-ghost equivalent applied via inline so we can keep
        // the card-magnetic tilt without conflicting class composition.
        // Rim-light along the top edge + shadow gives the tile real depth.
        boxShadow:
          'inset 0 1px 0 hsl(var(--ink-primary) / 0.07), var(--shadow-2), inset 0 0 0 1px hsl(var(--ink-primary) / 0.05)',
      }}
    >
      <SmartImage
        src={track.thumbnail}
        alt={track.title}
        loading="lazy"
        rounded="rounded-none"
        className="w-full h-full"
        interactive
      />
      {typeof index === 'number' ? (
        <span
          aria-hidden="true"
          className="absolute top-2 left-2.5 font-editorial text-ink leading-none text-2xl mix-blend-difference opacity-90 group-hover:opacity-0 transition-opacity tabular"
        >
          {String(index + 1).padStart(2, '0')}
        </span>
      ) : null}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-short" />
    </div>
    <span
      aria-hidden="true"
      className="btn-juicy absolute bottom-[58px] right-3 w-10 h-10 rounded-full gradient-accent text-track-fg flex items-center justify-center shadow-accent ring-1 ring-white/20 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-short ease-emphasis"
      style={{
        backgroundImage:
          'radial-gradient(circle at 30% 25%, hsl(var(--ink-primary) / 0.22), transparent 55%), linear-gradient(135deg, hsl(var(--track-accent)), hsl(var(--track-accent-strong)))',
      }}
    >
      <Play className="w-4 h-4 fill-current ml-0.5" />
    </span>
    <div className="mt-3.5 min-w-0">
      <p className={`text-[14px] font-medium truncate tracking-tight ${isCurrent ? 'text-accent' : 'text-ink'}`}>
        {track.title}
      </p>
      <p className="font-editorial text-[12.5px] text-ink-3 truncate mt-0.5">
        {track.artist || 'Unknown artist'}
      </p>
      {isCurrent ? (
        <div className="mt-1.5">
          <NowPlayingChip />
        </div>
      ) : null}
    </div>
  </button>
  );
};

export const TileSkeleton = () => (
  <div className="flex-shrink-0 w-44">
    <Skeleton className="aspect-square rounded-sharp" />
    <Skeleton className="h-4 w-3/4 mt-3" />
    <Skeleton className="h-3 w-1/2 mt-2" />
  </div>
);

export default TileCard;
