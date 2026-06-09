import { Volume2, Volume1, VolumeX } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

const VolumeControl = ({ className, compact = false }) => {
  const { volume, isMuted, setVolume, toggleMute } = usePlayer();
  const muted = isMuted || volume === 0;
  const VolumeIcon = muted ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      className={cn(
        compact
          ? 'mx-auto flex h-11 w-full max-w-[400px] items-center gap-1.5 rounded-full border border-white/[0.07] bg-surface-0/36 px-2.5'
          : 'flex w-full items-center gap-2.5 rounded-panel border border-white/[0.08] bg-surface-0/40 px-3 py-2',
        className,
      )}
    >
      <button
        type="button"
        onClick={toggleMute}
        className={cn(
          'touch-target shrink-0 rounded-full text-ink-3 transition-colors hover:bg-white/[0.06] hover:text-ink focus-ring',
          compact ? 'h-9 w-9 p-1' : 'p-1.5',
        )}
        aria-label={muted ? 'Unmute' : 'Mute'}
        aria-pressed={muted}
      >
        <VolumeIcon className={compact ? 'mx-auto h-4 w-4' : 'h-[18px] w-[18px]'} />
      </button>
      <Slider
        value={[Math.round(volume * 100)]}
        max={100}
        step={1}
        onValueChange={(v) => setVolume(v[0] / 100)}
        className={cn(
          'flex-1',
          compact
            ? '[&_.slider-track]:h-[2px] [&_.slider-track]:transition-[height] [&_.slider-track]:duration-short [&_.slider-track]:ease-emphasis hover:[&_.slider-track]:h-[3.5px] focus-within:[&_.slider-track]:h-[3.5px]'
            : '[&_.slider-track]:h-[2.5px] [&_.slider-track]:transition-[height] [&_.slider-track]:duration-short [&_.slider-track]:ease-emphasis hover:[&_.slider-track]:h-[3.5px] focus-within:[&_.slider-track]:h-[3.5px]',
        )}
        aria-label="Volume"
      />
    </div>
  );
};

export default VolumeControl;
