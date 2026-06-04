import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import Skeleton from '@/components/ui-v2/Skeleton';
import EmptyState from '@/components/ui-v2/EmptyState';
import Button from '@/components/ui-v2/Button';
import SmartImage from '@/components/SmartImage';
import { getGenres } from '@/lib/api';
import { cachePolicy, queryKeys } from '@/lib/query-keys';
import { fadeUp, staggerChildren } from '@/design/motion';
import { useEditorialMeta } from '@/hooks/use-editorial-meta';

const GenresPage = () => {
  const { data: genres = [], isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.genres(),
    queryFn: getGenres,
    ...cachePolicy.genres,
  });
  const { masthead } = useEditorialMeta();

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

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Genres unavailable"
          description="We couldn't reach the catalog service. Try again in a moment."
          action={
            <Button onClick={() => refetch()} size="md">
              Try again
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
                return (
                  <motion.div variants={fadeUp} key={g.id}>
                    <Link
                      to={`/explore?genre=${g.id}`}
                      className="relative block aspect-[3/2] rounded-sharp overflow-hidden border border-white/[0.08] hover:border-white/25 focus-ring transition-colors group shadow-elev-2 hover:shadow-elev-3"
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
