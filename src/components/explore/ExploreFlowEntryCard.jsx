import { Infinity as InfinityIcon, MoveRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui-v2/Button';

const ExploreFlowEntryCard = ({
  mood = '',
  genre = '',
  seed = '',
}) => {
  const params = new URLSearchParams();
  if (mood) params.set('mood', mood);
  if (genre) params.set('genre', genre);
  if (seed) params.set('seed', seed);
  const to = `/explore/flow${params.toString() ? `?${params.toString()}` : ''}`;

  return (
    <section className="mb-14 rounded-soft border border-white/[0.08] p-5 md:p-6 bg-[radial-gradient(ellipse_65%_80%_at_10%_0%,hsl(var(--iris)/0.20),transparent_60%),hsl(var(--surface-2)/0.58)]">
      <p className="eyebrow eyebrow-accent inline-flex items-center gap-2 mb-2">
        <InfinityIcon className="w-3.5 h-3.5" />
        Infinite mode
      </p>
      <h3 className="font-display text-3xl md:text-[40px] text-ink leading-[1.02]">
        Keep discovering without breaks.
      </h3>
      <p className="font-editorial text-[13px] text-ink-3 mt-2 max-w-2xl">
        Enter Explore Flow for a continuous stream tuned by your mood, genre, and live community momentum.
      </p>
      <div className="mt-5">
        <Button asChild type="button" size="lg" leftIcon={<MoveRight className="w-4 h-4" />}>
          <Link to={to}>Enter Explore Flow</Link>
        </Button>
      </div>
    </section>
  );
};

export default ExploreFlowEntryCard;
