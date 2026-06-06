import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Shuffle } from 'lucide-react';
import Button from '@/components/ui-v2/Button';
import Skeleton from '@/components/ui-v2/Skeleton';
import SmartImage from '@/components/SmartImage';
import { fadeUp, staggerChildren } from '@/design/motion';
import { shuffleArray } from '@/lib/shuffle';

// SpotlightArtist — an editorial "artist of the day" block. Lands a single
// big-name artist on Home with 6 of their top tracks inline, so a brand-new
// user can dive into one full catalog with a single tap.
//
// Renders nothing when the parent hasn't resolved the seed artist yet —
// the parent gates render based on `artistQuery.data?.topTracks?.length`.
const SpotlightArtist = ({ artist, fallbackImage, onPlayTrack, onPlayAll }) => {
  if (!artist || !Array.isArray(artist.topTracks) || artist.topTracks.length === 0) {
    return null;
  }

  const tracks = artist.topTracks.slice(0, 6);
  const portrait = artist.cover || artist.thumbnail || fallbackImage;
  const slug = artist.humanSlug || artist.slug || artist.id;

  const handlePlayAll = () => {
    if (typeof onPlayAll === 'function') onPlayAll(artist.topTracks);
  };

  const handleShuffle = () => {
    if (typeof onPlayAll === 'function') onPlayAll(shuffleArray(artist.topTracks));
  };

  return (
    <motion.section
      {...fadeUp}
      aria-labelledby="home-spotlight-artist"
      className="mb-14 rounded-soft overflow-hidden border border-white/[0.08] bg-surface-2/40 backdrop-blur-md"
      style={{
        background:
          'radial-gradient(ellipse 70% 100% at 0% 0%, hsl(var(--track-accent) / 0.22), transparent 60%), radial-gradient(ellipse 60% 80% at 100% 100%, hsl(var(--oxblood) / 0.30), transparent 60%), hsl(var(--surface-2) / 0.6)',
      }}
    >
      <div className="grid md:grid-cols-[260px_1fr] gap-6 md:gap-10 p-6 md:p-8 items-start">
        {/* Portrait */}
        <div className="relative">
          <Link
            to={slug ? `/artist/${encodeURIComponent(slug)}` : '#'}
            className="block aspect-square rounded-sharp overflow-hidden ring-1 ring-white/[0.10] focus-ring lift press group"
          >
            <SmartImage
              src={portrait}
              alt={artist.name}
              loading="lazy"
              rounded="rounded-none"
              className="w-full h-full"
              imgClassName="object-cover group-hover:scale-105 transition-transform duration-long ease-emphasis"
            />
            <span
              aria-hidden="true"
              className="absolute top-3 left-3 font-mono text-[10px] uppercase tracking-[0.22em] text-white/80 bg-black/35 backdrop-blur-sm rounded-full px-2 py-0.5 border border-white/15"
            >
              Spotlight
            </span>
          </Link>
        </div>

        {/* Body */}
        <div className="min-w-0">
          <p className="eyebrow eyebrow-accent mb-2">Featured artist · this week</p>
          <h2
            id="home-spotlight-artist"
            className="font-display text-3xl md:text-[40px] text-ink leading-[1.02] headline-balance"
          >
            {artist.name}
          </h2>
          <p className="font-editorial text-[13.5px] text-ink-3 mt-2 max-w-md leading-snug body-pretty">
            Six of {artist.name}&apos;s biggest tracks — a one-tap doorway into the whole catalog.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 mt-4">
            <Button
              variant="premium"
              size="md"
              onClick={handlePlayAll}
              leftIcon={<Play className="w-4 h-4 fill-current" />}
            >
              Play top tracks
            </Button>
            <Button
              variant="glass"
              size="md"
              onClick={handleShuffle}
              leftIcon={<Shuffle className="w-4 h-4" />}
            >
              Shuffle
            </Button>
            {slug ? (
              <Button asChild variant="editorial" size="md">
                <Link to={`/artist/${encodeURIComponent(slug)}`} className="inline-flex items-center gap-2">
                  Open artist
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            ) : null}
          </div>

          {/* Track list */}
          <motion.ol
            variants={staggerChildren(0.04)}
            initial="initial"
            animate="animate"
            className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-1.5"
          >
            {tracks.map((track, idx) => (
              <motion.li variants={fadeUp} key={track.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof onPlayTrack === 'function') onPlayTrack(track);
                  }}
                  className="group w-full flex items-center gap-3 py-2 px-2.5 rounded-sharp text-left hover:bg-white/[0.05] focus-ring transition-colors"
                >
                  <span
                    aria-hidden="true"
                    className="font-editorial italic text-ink-3 group-hover:text-track w-6 text-right tabular text-sm transition-colors"
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <SmartImage
                    src={track.thumbnail}
                    alt=""
                    kind="track"
                    rounded="rounded-sharp"
                    className="w-10 h-10 ring-1 ring-white/10 flex-shrink-0"
                    imgClassName="object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium truncate text-ink group-hover:text-accent transition-colors">
                      {track.title}
                    </p>
                    <p className="font-editorial text-[12px] text-ink-3 truncate mt-0.5">
                      {track.album || artist.name}
                    </p>
                  </div>
                  <Play className="w-3.5 h-3.5 fill-current text-ink-4 group-hover:text-accent transition-colors flex-shrink-0" />
                </button>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>
    </motion.section>
  );
};

export const SpotlightArtistSkeleton = () => (
  <div className="mb-14 rounded-soft overflow-hidden border border-white/[0.08] bg-surface-2/40">
    <div className="grid md:grid-cols-[260px_1fr] gap-6 md:gap-10 p-6 md:p-8">
      <Skeleton className="aspect-square rounded-sharp" />
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-10 w-32 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-sharp" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default SpotlightArtist;
