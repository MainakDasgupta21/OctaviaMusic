import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { Map as MapIcon, Play } from 'lucide-react';
import Skeleton from '@/components/ui-v2/Skeleton';
import EmptyState from '@/components/ui-v2/EmptyState';
import Button from '@/components/ui-v2/Button';
import SmartImage from '@/components/SmartImage';
import { usePlayer } from '@/contexts/PlayerContext';
import { getGenres } from '@/lib/api';
import { cachePolicy, queryKeys } from '@/lib/query-keys';
import { fadeUp, staggerChildren } from '@/design/motion';
import { useEditorialMeta } from '@/hooks/use-editorial-meta';
import { usePageError } from '@/hooks/use-page-error';
import { smoothScrollIntoView } from '@/lib/scroll';
import notify from '@/lib/notify';
import { cn } from '@/lib/utils';

const GenresPage = () => {
  const { data: genres = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.genres(),
    queryFn: getGenres,
    ...cachePolicy.genres,
  });
  const pageError = usePageError(error, { resource: 'the genre atlas' });
  const { masthead } = useEditorialMeta();
  const [searchParams] = useSearchParams();
  const targetGenre = searchParams.get('genre');
  const cardsRef = useRef({});
  const { playTrack } = usePlayer();

  // Scroll the highlighted genre into view when the URL carries `?genre=…`.
  useEffect(() => {
    if (!targetGenre || isLoading) return;
    const el = cardsRef.current[targetGenre];
    if (el) {
      smoothScrollIntoView(el, { block: 'center' });
    }
  }, [targetGenre, isLoading]);

  const handlePlaySample = (e, genre) => {
    e.preventDefault();
    e.stopPropagation();
    if (!genre.sampleTrack) {
      notify.info('No sample available for this genre');
      return;
    }
    playTrack(genre.sampleTrack);
    notify.info(`Sampling \u00b7 ${genre.label}`);
  };

  return (
    <div className="p-5 md:p-10 max-w-[1600px] mx-auto pb-12">
      {/* Editorial masthead */}
      <div
        aria-hidden="true"
        className="hidden md:flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-ink-4 mb-8 pb-3 border-b border-white/[0.08]"
      >
        <span>{masthead}</span>
        <span className="flex items-center gap-3">
          <span className="text-ink-3">✦</span>
          <span>The Octavia Daily · The Atlas</span>
          <span className="text-ink-3">✦</span>
        </span>
        <span>Genres &amp; moods</span>
      </div>

      <motion.div {...fadeUp} className="mb-10">
        <p className="eyebrow eyebrow-accent mb-3 flex items-center gap-2">
          <span className="w-6 h-px bg-track" />
          The atlas
        </p>
        <h1 className="font-display text-display-xl text-ink leading-[0.92] mask-rise">
          <span>
            Pick a{' '}
            <em className="font-editorial text-track not-italic">corner</em>{' '}
            of music.
          </span>
        </h1>
        <p className="font-editorial text-[15px] text-ink-3 mt-4 max-w-xl leading-snug">
          {isLoading
            ? 'Loading genres…'
            : `${genres.length} genres, organized by feel, era, and intent.`}
        </p>
      </motion.div>

      {isError && pageError ? (
        <EmptyState
          icon={pageError.icon}
          title={pageError.title}
          description={pageError.description}
          action={
            <Button onClick={() => refetch()} size="md">
              Try again
            </Button>
          }
        />
      ) : !isLoading && genres.length === 0 ? (
        <EmptyState
          icon={MapIcon}
          title="No genres yet"
          description="The atlas is being assembled. Check back in a few minutes."
          action={
            <Button onClick={() => refetch()} size="md" variant="secondary">
              Refresh
            </Button>
          }
        />
      ) : (
        <motion.div
          variants={staggerChildren(0.03)}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/2] rounded-sharp" />
              ))
            : genres.map((g, idx) => {
                const firstLetter = (g.label || '?').trim()[0] || '?';
                const isTarget = targetGenre === g.id;
                return (
                  <motion.div variants={fadeUp} key={g.id}>
                    <Link
                      to={`/explore?genre=${g.id}`}
                      ref={(node) => {
                        cardsRef.current[g.id] = node;
                      }}
                      className={cn(
                        'relative block aspect-[3/2] rounded-sharp overflow-hidden border border-white/[0.08] hover:border-white/25 focus-ring transition-colors group shadow-elev-2 hover:shadow-elev-3',
                        isTarget && 'border-track ring-2 ring-track/50',
                      )}
                    >
                      {/* Background — image preferred, otherwise the editorial mix */}
                      {g.thumbnail ? (
                        <SmartImage
                          src={g.thumbnail}
                          alt=""
                          kind="genre"
                          rounded="rounded-none"
                          className="absolute inset-0 w-full h-full opacity-70 group-hover:opacity-85 group-hover:scale-[1.04] transition-all duration-long ease-emphasis"
                          imgClassName="object-cover"
                        />
                      ) : (
                        <div
                          className={`absolute inset-0 bg-gradient-to-br ${g.from || 'from-violet-500/60'} ${g.to || 'to-fuchsia-700/60'} opacity-90`}
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-tr from-black/75 via-black/30 to-transparent" />

                      {/* Outsized Fraunces italic drop-cap */}
                      <span
                        aria-hidden="true"
                        className="absolute -right-3 -bottom-6 font-editorial italic text-[180px] leading-none text-white/[0.10] group-hover:text-white/[0.18] transition-colors select-none"
                        style={{ fontFeatureSettings: '"opsz" 144' }}
                      >
                        {firstLetter}
                      </span>

                      {/* Sample-track quick play button — only when we have a
                          sample. Stops propagation so it doesn't navigate. */}
                      {g.sampleTrack ? (
                        <button
                          type="button"
                          onClick={(e) => handlePlaySample(e, g)}
                          aria-label={`Sample ${g.label}`}
                          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-track text-track-fg flex items-center justify-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shadow-accent ring-1 ring-white/20 hover:scale-105 active:scale-95"
                        >
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </button>
                      ) : null}

                      <div className="relative p-5 h-full flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">
                            №{String(idx + 1).padStart(2, '0')}
                          </p>
                          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">
                            Genre
                          </span>
                        </div>
                        <p className="font-display text-[28px] leading-tight text-white drop-shadow">
                          {g.label}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
        </motion.div>
      )}

      {/* End-of-atlas footer */}
      {!isLoading && !isError && genres.length > 0 ? (
        <div className="mt-10 flex items-center gap-4 text-[10px] font-mono uppercase tracking-[0.2em] text-ink-4">
          <span className="flex-1 h-px bg-white/[0.08]" />
          <span>End of atlas · {genres.length} genres</span>
          <span className="flex-1 h-px bg-white/[0.08]" />
        </div>
      ) : null}
    </div>
  );
};

export default GenresPage;
