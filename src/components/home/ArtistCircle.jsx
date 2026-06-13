import { Link } from 'react-router-dom';
import SmartImage from '@/components/SmartImage';
import { cn } from '@/lib/utils';

const ArtistCircle = ({ artist, sample, slug, fluid = false, className }) => {
  const content = (
    <>
      <div className="aspect-square rounded-full overflow-hidden ring-1 ring-white/[0.08] bg-surface-2 group-hover:ring-track/50 transition-all duration-short shadow-elev-1 group-hover:shadow-elev-3">
        {sample ? (
          <SmartImage
            src={sample}
            alt={artist}
            loading="lazy"
            rounded="rounded-full"
            className="w-full h-full"
            interactive
          />
        ) : (
          <div className="w-full h-full" />
        )}
      </div>
      <p className="mt-3 text-[13px] font-medium truncate text-ink tracking-tight">{artist}</p>
      <p className="font-editorial text-[11.5px] text-ink-3">
        {slug ? 'Artist' : 'Artist profile unavailable'}
      </p>
    </>
  );

  const rootClass = cn(
    'text-center group rounded-sharp',
    fluid ? 'w-full min-w-0' : 'flex-shrink-0 w-36 snap-start',
    className,
  );

  if (!slug) {
    return (
      <div
        className={cn(rootClass, 'opacity-80')}
        aria-disabled="true"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      to={`/artist/${encodeURIComponent(slug)}`}
      className={cn(rootClass, 'focus-ring lift press')}
    >
      {content}
    </Link>
  );
};

export default ArtistCircle;
