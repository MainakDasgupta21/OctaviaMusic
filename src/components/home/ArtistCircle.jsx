import { Link } from 'react-router-dom';
import SmartImage from '@/components/SmartImage';

const ArtistCircle = ({ artist, sample, slug }) => {
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

  if (!slug) {
    return (
      <div
        className="flex-shrink-0 w-36 text-center group snap-start rounded-sharp opacity-80"
        aria-disabled="true"
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      to={`/artist/${encodeURIComponent(slug)}`}
      className="flex-shrink-0 w-36 text-center group snap-start focus-ring rounded-sharp lift press"
    >
      {content}
    </Link>
  );
};

export default ArtistCircle;
