import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Loader2, Play } from 'lucide-react';
import SectionHeader from '@/components/ui-v2/SectionHeader';
import { searchMusic } from '@/lib/api';
import { cachePolicy, queryKeys } from '@/lib/query-keys';
import notify from '@/lib/notify';
import { fadeUp, staggerChildren } from '@/design/motion';
import { cn } from '@/lib/utils';

// Six culture/region scenes that the WorldStrip surfaces. Each one is a
// distinct keyword the live search backend handles well — picked to span
// multiple continents and languages so first-time users hear something
// they probably wouldn't have searched for on their own.
const SCENES = [
  {
    id: 'kpop',
    label: 'K-Pop',
    region: 'South Korea',
    query: 'kpop hits',
    gradient: 'from-pink-500/65 via-fuchsia-600/55 to-violet-700/65',
  },
  {
    id: 'afrobeats',
    label: 'Afrobeats',
    region: 'Nigeria · Ghana',
    query: 'afrobeats hits',
    gradient: 'from-amber-400/70 via-orange-500/60 to-red-600/65',
  },
  {
    id: 'bollywood',
    label: 'Bollywood',
    region: 'India',
    query: 'bollywood hits',
    gradient: 'from-rose-500/65 via-red-500/55 to-orange-600/65',
  },
  {
    id: 'reggaeton',
    label: 'Reggaeton',
    region: 'Puerto Rico · Colombia',
    query: 'reggaeton hits',
    gradient: 'from-emerald-500/65 via-teal-600/55 to-cyan-700/65',
  },
  {
    id: 'jpop',
    label: 'J-Pop',
    region: 'Japan',
    query: 'jpop hits',
    gradient: 'from-sky-500/65 via-indigo-600/55 to-purple-700/65',
  },
  {
    id: 'latin',
    label: 'Latin',
    region: 'Mexico · Brazil',
    query: 'latin pop hits',
    gradient: 'from-orange-400/65 via-pink-500/55 to-rose-600/65',
  },
];

// Extract a playable track list from the /api/search payload. The 'song'
// branch returns a flat array of track DTOs; defensive handling keeps the
// strip usable if upstream ever wraps the array in an object.
const extractTracks = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.songs)) return payload.songs;
  if (Array.isArray(payload?.tracks)) return payload.tracks;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const WorldStrip = ({ onPlayTracks }) => {
  const queryClient = useQueryClient();
  const [loadingId, setLoadingId] = useState(null);

  const handlePlay = async (scene) => {
    if (loadingId) return;
    setLoadingId(scene.id);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: queryKeys.search(scene.query, 'song', 12),
        queryFn: ({ signal }) => searchMusic(scene.query, 'song', { limit: 12, signal }),
        ...cachePolicy.search,
      });
      const tracks = extractTracks(data);
      if (tracks.length === 0) {
        notify.error(`No ${scene.label} tracks available right now`);
        return;
      }
      if (typeof onPlayTracks === 'function') {
        onPlayTracks(tracks, { replaceQueue: true, forceSequential: false });
      }
      notify.info(`${scene.label} \u00b7 ${scene.region}`);
    } catch (err) {
      notify.error(`Could not load ${scene.label}`);
      // Surface to console for ops; the toast is the user-facing signal.
      // eslint-disable-next-line no-console
      console.error('[WorldStrip] play failed', scene.id, err);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <section className="mb-12" aria-labelledby="home-world-strip">
      <SectionHeader
        id="home-world-strip"
        eyebrow="Sounds from around the world"
        title="One tap, somewhere new."
        subtitle="Six scenes pulled from every continent — tap one and the music starts."
      />
      <motion.div
        variants={staggerChildren(0.04)}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
      >
        {SCENES.map((scene) => {
          const isLoading = loadingId === scene.id;
          return (
            <motion.button
              variants={fadeUp}
              key={scene.id}
              type="button"
              onClick={() => handlePlay(scene)}
              disabled={Boolean(loadingId)}
              aria-busy={isLoading || undefined}
              aria-label={`Play ${scene.label} from ${scene.region}`}
              className={cn(
                'relative aspect-[4/3] rounded-sharp overflow-hidden p-4 text-left focus-ring transition-transform',
                'border border-white/[0.08] hover:border-white/25 group',
                'disabled:opacity-70 disabled:cursor-not-allowed',
                !loadingId && 'hover:-translate-y-0.5',
              )}
              style={{ background: 'hsl(var(--surface-2))' }}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-0 bg-gradient-to-br opacity-90 group-hover:opacity-100 transition-opacity',
                  scene.gradient,
                )}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

              {/* Play / loader chip in the top-right */}
              <span className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center">
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </span>

              <div className="relative h-full flex flex-col justify-end">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/70">
                  {scene.region}
                </p>
                <p className="font-display text-xl md:text-2xl text-white drop-shadow leading-tight mt-1">
                  {scene.label}
                </p>
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </section>
  );
};

export default WorldStrip;
