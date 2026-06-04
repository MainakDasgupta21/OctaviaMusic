import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, User } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { artistSlugOf, isUsableArtistSlug } from '@/lib/slug';
import SmartImage from '@/components/SmartImage';
import { cn } from '@/lib/utils';

// =============================================================================
// Spotify-style "About the artist" + "More by this artist".
// The right-rail Related tab leads with a hero artist card (image header,
// name, stat line, Go-to-artist CTA), followed by tracks by the same artist
// and a "You might also like" tail.
// =============================================================================

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
      moreByArtist: sameArtist.slice(0, 4),
      youMightLike: others.slice(0, 4),
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
      className="group relative block rounded-2xl overflow-hidden ring-1 ring-white/[0.08] focus-ring h-[170px]"
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
        className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(120% 70% at 20% 100%, hsl(var(--track-accent) / 0.32), transparent 70%)',
        }}
      />

      <div className="relative h-full p-4 flex flex-col justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-white/75 inline-flex items-center gap-1.5">
          <User className="w-3 h-3" strokeWidth={2.2} />
          About the artist
        </span>

        <div>
          <p className="font-display font-semibold text-white text-[26px] leading-[1.05] tracking-tight truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
            {track.artist || 'Unknown artist'}
          </p>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="text-[12px] text-white/75 tabular-nums">
              <span className="font-medium text-white">{formatCount(listeners)}</span>
              <span className="text-white/55"> monthly listeners</span>
            </p>
            <span
              aria-hidden="true"
              className="inline-flex items-center gap-1.5 text-[11.5px] font-mono uppercase tracking-[0.18em] text-white/80 group-hover:text-white transition-colors"
            >
              Go to artist
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

const SectionLabel = ({ children }) => (
  <p className="px-1 font-mono text-[10px] uppercase tracking-[0.24em] text-ink-3">
    {children}
  </p>
);

const TrackRow = ({ track, onPlay, dense = false }) => (
  <button
    type="button"
    onClick={() => onPlay(track)}
    className="group w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] text-left focus-ring transition-colors"
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
        className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
      >
        <Play className="w-4 h-4 text-white fill-current ml-0.5" />
      </span>
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[13.5px] font-medium truncate text-ink group-hover:text-white">
        {track.title}
      </p>
      <p className="text-[12px] text-ink-3 truncate mt-0.5">{track.artist || 'Unknown artist'}</p>
    </div>
  </button>
);

const RelatedRail = () => {
  const { currentTrack, playTrack } = usePlayer();
  const { moreByArtist, youMightLike, playsByArtist } = useRelated();

  if (!currentTrack) return null;

  const hasAnything = moreByArtist.length > 0 || youMightLike.length > 0;

  return (
    <div className="h-full overflow-y-auto custom-scrollbar -mx-1 px-1 pb-1 space-y-5">
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
        <p className="px-2 py-6 text-center text-[13px] text-ink-3">
          Play a few more songs and we'll surface picks here.
        </p>
      )}
    </div>
  );
};

export default RelatedRail;
