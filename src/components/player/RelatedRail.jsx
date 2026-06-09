import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, User } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { artistSlugOf, isUsableArtistSlug } from '@/lib/slug';
import SmartImage from '@/components/SmartImage';
import { cn } from '@/lib/utils';

const formatCount = (n) => {
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

// Deterministic, plausible "monthly listeners" derived from artist name +
// play count. Used as a Spotify-style stat when we don't have real numbers.
const fauxMonthlyListeners = (artist, playCount) => {
  if (!artist) return null;
  let hash = 0;
  for (let i = 0; i < artist.length; i += 1) {
    hash = (hash * 31 + artist.charCodeAt(i)) | 0;
  }
  const base = 80_000 + Math.abs(hash) % 18_000_000;
  return base + playCount * 1_237;
};

const useRelated = () => {
  const { history, currentTrack } = usePlayer();
  return useMemo(() => {
    const artist = currentTrack?.artist;
    const sameArtist = history.filter(
      (t) => t.id !== currentTrack?.id && t.artist === artist,
    );
    const others = history.filter(
      (t) => t.id !== currentTrack?.id && t.artist !== artist,
    );
    const playsByArtist = history.filter((t) => t.artist === artist).length;
    return {
      moreByArtist: sameArtist.slice(0, 3),
      youMightLike: others.slice(0, 3),
      playsByArtist,
    };
  }, [history, currentTrack?.id, currentTrack?.artist]);
};

const ArtistHero = ({ track, playsByArtist }) => {
  const slug = artistSlugOf(track);
  const listeners = fauxMonthlyListeners(track.artist, playsByArtist);
  return (
    <Link
      to={isUsableArtistSlug(slug) ? `/artist/${slug}` : '#'}
      aria-disabled={!isUsableArtistSlug(slug)}
      className="group relative block h-[150px] overflow-hidden rounded-panel border border-white/[0.08] focus-ring"
    >
      <SmartImage
        src={track.thumbnail}
        alt=""
        kind="artist"
        aria-hidden="true"
        rounded="rounded-none"
        className="absolute inset-0 w-full h-full"
        imgClassName="object-cover scale-105 group-hover:scale-110 transition-transform duration-700 ease-emphasis"
        style={{ filter: 'saturate(1.1)' }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/38 to-black/18"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            'radial-gradient(100% 70% at 20% 100%, hsl(var(--track-accent) / 0.26), transparent 74%)',
        }}
      />

      <div className="relative flex h-full flex-col justify-between p-3.5">
        <span className="inline-flex items-center gap-1.5 font-mono text-eyebrow uppercase tracking-[0.2em] text-white/75">
          <User className="w-3 h-3" strokeWidth={2.2} />
          Artist
        </span>

        <div>
          <p className="truncate font-display text-[22px] font-semibold leading-[1.08] tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
            {track.artist || 'Unknown artist'}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-2.5">
            <p className="tabular-nums text-[11.5px] text-white/74">
              <span className="font-medium text-white">{formatCount(listeners)}</span>
              <span className="text-white/55"> monthly listeners</span>
            </p>
            <span
              aria-hidden="true"
              className="inline-flex items-center gap-1.5 font-mono text-micro uppercase tracking-[0.16em] text-white/80 transition-colors group-hover:text-white"
            >
              View
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

const SectionLabel = ({ children }) => (
  <p className="px-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-4">
    {children}
  </p>
);

const TrackRow = ({ track, onPlay, dense = false }) => (
  <button
    type="button"
    onClick={() => onPlay(track)}
    className="group flex w-full items-center gap-2.5 rounded-panel px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04] focus-ring"
  >
    <div
      className={cn(
        'relative shrink-0 ring-1 ring-white/10',
        dense ? 'w-10 h-10' : 'w-11 h-11',
      )}
    >
      <SmartImage
        src={track.thumbnail}
        alt=""
        kind="track"
        rounded="rounded-lg"
        className="absolute inset-0 w-full h-full"
        imgClassName="object-cover"
      />
      <span
        aria-hidden="true"
        className="touch-action-visible absolute inset-0 bg-black/55 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
      >
        <Play className="w-4 h-4 text-white fill-current ml-0.5" />
      </span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="truncate text-label font-medium text-ink group-hover:text-white">
        {track.title}
      </p>
      <p className="mt-0.5 truncate text-tiny text-ink-3">{track.artist || 'Unknown artist'}</p>
    </div>
  </button>
);

// Renamed from `RelatedRail` to `PlayerRelatedRail` to avoid the name
// collision with `SearchRelatedRail` (the search-page related rail). The
// player rail surfaces "more from this artist" based on listening history;
// the search rail surfaces context for a search top-result. They are distinct
// features that previously shared a name only by accident.
const PlayerRelatedRail = () => {
  const { currentTrack, playTrack } = usePlayer();
  const { moreByArtist, youMightLike, playsByArtist } = useRelated();

  if (!currentTrack) return null;

  const hasAnything = moreByArtist.length > 0 || youMightLike.length > 0;

  return (
    <div data-lenis-prevent className="h-full overflow-y-auto custom-scrollbar -mx-1 px-1 pb-1 space-y-3.5">
      <ArtistHero track={currentTrack} playsByArtist={playsByArtist} />

      {moreByArtist.length > 0 && (
        <section className="space-y-2">
          <SectionLabel>More by {currentTrack.artist || 'Unknown artist'}</SectionLabel>
          <ul className="space-y-1">
            {moreByArtist.map((t) => (
              <li key={t.id}>
                <TrackRow track={t} onPlay={playTrack} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {youMightLike.length > 0 && (
        <section className="space-y-2">
          <SectionLabel>You might also like</SectionLabel>
          <ul className="space-y-1">
            {youMightLike.map((t) => (
              <li key={t.id}>
                <TrackRow track={t} onPlay={playTrack} dense />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!hasAnything && (
        <p className="px-2 py-6 text-center text-label text-ink-3">
          Play a few more songs and we'll surface picks here.
        </p>
      )}
    </div>
  );
};

export { PlayerRelatedRail };
export default PlayerRelatedRail;
