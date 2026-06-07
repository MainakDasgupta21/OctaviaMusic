import { Heart, Loader2, MoveRight, SkipForward, X } from 'lucide-react';
import Button from '@/components/ui-v2/Button';
import SmartImage from '@/components/SmartImage';

const ExploreFlowDeck = ({
  track = null,
  queueCount = 0,
  isLoading = false,
  onPlay,
  onSave,
  onSkip,
  onLoadMore,
}) => {
  if (!track && isLoading) {
    return (
      <div className="rounded-soft border border-white/[0.08] bg-surface-2/45 p-8 text-center">
        <Loader2 className="w-6 h-6 text-accent animate-spin mx-auto mb-3" />
        <p className="font-editorial text-[14px] text-ink-3">Building your infinite deck...</p>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="rounded-soft border border-white/[0.08] bg-surface-2/45 p-8 text-center">
        <p className="font-display text-2xl text-ink">Flow paused</p>
        <p className="font-editorial text-[13px] text-ink-3 mt-2">
          Tap below to pull another discovery batch.
        </p>
        <div className="mt-5">
          <Button type="button" onClick={onLoadMore} leftIcon={<MoveRight className="w-4 h-4" />}>
            Load next set
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-soft border border-white/[0.08] bg-surface-2/45 p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-4">Infinite discovery</p>
        <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-ink-4">{queueCount} queued</p>
      </div>

      <div className="relative rounded-soft overflow-hidden border border-white/10 aspect-[16/10]">
        <SmartImage
          src={track.thumbnail}
          alt=""
          kind="track"
          rounded="rounded-none"
          className="absolute inset-0 w-full h-full"
          imgClassName="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="font-display text-3xl text-white leading-tight">{track.title}</p>
          <p className="font-editorial text-[14px] text-white/75 mt-1">{track.artist || 'Unknown artist'}</p>
        </div>
      </div>

      <div className="mt-4 grid sm:grid-cols-4 gap-2">
        <Button type="button" variant="premium" onClick={onPlay} leftIcon={<MoveRight className="w-4 h-4" />}>
          Play
        </Button>
        <Button type="button" variant="secondary" onClick={onSave} leftIcon={<Heart className="w-4 h-4 fill-current" />}>
          Save
        </Button>
        <Button type="button" variant="glass" onClick={onSkip} leftIcon={<X className="w-4 h-4" />}>
          Skip
        </Button>
        <Button type="button" variant="outline" onClick={onLoadMore} leftIcon={<SkipForward className="w-4 h-4" />}>
          More
        </Button>
      </div>
    </div>
  );
};

export default ExploreFlowDeck;
