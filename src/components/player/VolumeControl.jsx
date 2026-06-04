import { Volume2, Volume1, VolumeX } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

// Inline volume row pinned at the bottom of the hero card.
// Surface treatment matches the seek block so the two read as a pair.
const VolumeControl = ({ className }) => {
  const { volume, isMuted, setVolume, toggleMute } = usePlayer();
  const muted = isMuted || volume === 0;
  const VolumeIcon = muted ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div
      className={cn(
        'flex items-center gap-3 w-full px-3 py-1.5 rounded-full border border-white/[0.08] bg-black/30',
        className,
      )}
    >
      <button
        type="button"
        onClick={toggleMute}
        className="text-ink-3 hover:text-ink transition-colors focus-ring rounded-full p-1 shrink-0"
        aria-label={muted ? 'Unmute' : 'Mute'}
        aria-pressed={muted}
      >
        <VolumeIcon className="w-[18px] h-[18px]" />
      </button>
      <Slider
        value={[Math.round(volume * 100)]}
        max={100}
        step={1}
        onValueChange={(v) => setVolume(v[0] / 100)}
        className="flex-1"
        aria-label="Volume"
      />
      <Volume2
        aria-hidden="true"
        className="w-[18px] h-[18px] text-ink-4 shrink-0"
      />
    </div>
  );
};

export default VolumeControl;
