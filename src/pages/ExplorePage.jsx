import { useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sparkles, Sun, Moon, Headphones, Coffee, Flame, Heart, Play, Music2 } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useSettings } from '@/contexts/SettingsContext';
import SectionHeader from '@/components/ui-v2/SectionHeader';
import Skeleton from '@/components/ui-v2/Skeleton';
import EmptyState from '@/components/ui-v2/EmptyState';
import Button from '@/components/ui-v2/Button';
import SmartImage from '@/components/SmartImage';
import { getGenres, getTrending } from '@/lib/api';
import { cachePolicy, queryKeys } from '@/lib/query-keys';
import { fadeUp, staggerChildren } from '@/design/motion';
import { useEditorialMeta } from '@/hooks/use-editorial-meta';
import { shuffleArray } from '@/lib/shuffle';
import { smoothScrollIntoView } from '@/lib/scroll';
import notify from '@/lib/notify';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

// Editorial mood plates — paired with a Fraunces drop cap and a noun.
// `keywords` drive the radio seed: each mood maps to genre/keyword hints we
// match against the trending pool to bootstrap playback.
const MOODS = [
  { id: 'focus', label: 'Deep focus', dropCap: 'F', icon: Sparkles, keywords: ['focus', 'instrumental', 'piano', 'ambient'], mix: 'from-[#1a2236]/85 via-[#0f1525]/70 to-transparent' },
  { id: 'morning', label: 'First light', dropCap: 'M', icon: Sun, keywords: ['acoustic', 'morning', 'sunrise', 'folk'], mix: 'from-[#3a1f10]/85 via-[#1f120a]/70 to-transparent' },
  { id: 'evening', label: 'Slow evenings', dropCap: 'E', icon: Moon, keywords: ['evening', 'jazz', 'slow', 'soul'], mix: 'from-[#28122b]/85 via-[#170818]/70 to-transparent' },
  { id: 'workout', label: 'Workout', dropCap: 'W', icon: Flame, keywords: ['workout', 'hip hop', 'edm', 'energy'], mix: 'from-[#3a1212]/85 via-[#1c0808]/70 to-transparent' },
  { id: 'lounge', label: 'Late lounge', dropCap: 'L', icon: Headphones, keywords: ['lounge', 'chill', 'lofi', 'electronic'], mix: 'from-[#0f2226]/85 via-[#0a1417]/70 to-transparent' },
  { id: 'cafe', label: 'Cafe hours', dropCap: 'C', icon: Coffee, keywords: ['cafe', 'acoustic', 'indie', 'mellow'], mix: 'from-[#241808]/85 via-[#140d05]/70 to-transparent' },
];

// Pick `count` tracks from `pool` whose title/artist text contains any of the
// `keywords`. Falls back to a random sampling from the pool when no matches.
const buildMoodRadio = (pool, keywords, count = 12) => {
  if (!Array.isArray(pool) || pool.length === 0) return [];
  const lower = keywords.map((k) => k.toLowerCase());
  const matches = pool.filter((t) => {
    const haystack = `${t.title || ''} ${t.artist || ''}`.toLowerCase();
    return lower.some((k) => haystack.includes(k));
  });
  const picks = matches.length > 0 ? matches : pool;
  return shuffleArray(picks).slice(0, count);
};

const ExplorePage = () => {
  const { history, playTrack, addToQueue, playTracksInOrder } = usePlayer();
  const { list: favorites } = useFavorites();
  const { settings } = useSettings();
  const { masthead } = useEditorialMeta();
  const [searchParams, setSearchParams] = useSearchParams();
  const moodSectionRef = useRef(null);
  const mixesSectionRef = useRef(null);
  const genresSectionRef = useRef(null);

  const {
    data: genres = [],
    isLoading: genresLoading,
    isError: genresError,
    refetch: refetchGenres,
  } = useQuery({
    queryKey: queryKeys.genres(),
    queryFn: getGenres,
    ...cachePolicy.genres,
  });

  // For "Because you liked …" we use trending as a stand-in pool of similar tracks.
  const { data: trending = [] } = useQuery({
    queryKey: queryKeys.trending(20),
    queryFn: () => getTrending({ limit: 20 }),
    ...cachePolicy.trending,
  });

  // Daily Mixes derive from top artists in history/favorites — simple co-occurrence.
  const dailyMixes = useMemo(() => {
    const artistCount = new Map();
    [...history, ...favorites].forEach((t) => {
      if (!t?.artist) return;
      artistCount.set(t.artist, (artistCount.get(t.artist) || 0) + 1);
    });
    const top = Array.from(artistCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    if (top.length === 0) {
      return genres.slice(0, 6).map((g, i) => ({
        id: `dm-genre-${g.id}`,
        label: `Daily Mix ${String(i + 1).padStart(2, '0')}`,
        artist: g.label,
        thumbnail: g.thumbnail,
      }));
    }
    return top.map(([artist], i) => {
      const sample = [...favorites, ...history].find((t) => t.artist === artist);
      return {
        id: `dm-${i}`,
        label: `Daily Mix ${String(i + 1).padStart(2, '0')}`,
        artist,
        thumbnail: sample?.thumbnail || genres[i % Math.max(1, genres.length)]?.thumbnail,
      };
    });
  }, [history, favorites, genres]);

  const lastLiked = favorites[0];

  // Build a 4-card list of "more like X" — pick from trending, filter out duplicates.
  const becauseList = useMemo(() => {
    if (!lastLiked) return [];
    const seen = new Set([lastLiked.id]);
    return trending
      .filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      })
      .slice(0, 4);
  }, [trending, lastLiked]);

  const handlePlay = (track) => playTrack(track);
  const playBecause = () => {
    if (!becauseList.length) return;
    playTrack(becauseList[0]);
    becauseList.slice(1).forEach((t) => addToQueue(t));
  };

  const firstName = settings.displayName?.split(' ')[0] || 'you';

  // Deep-link handling. `?mood=focus` scrolls to the mood section and starts
  // a curated radio for that mood. `?genre=rock` or `?artist=…` scrolls to the
  // relevant section so the URL is no longer inert.
  const moodParam = searchParams.get('mood');
  const genreParam = searchParams.get('genre');
  const artistParam = searchParams.get('artist');
  const handledMoodRef = useRef(null);

  const playMood = (mood) => {
    const radio = buildMoodRadio(trending, mood.keywords, 12);
    if (radio.length === 0) {
      notify.info('Loading mood radio…');
      return;
    }
    playTracksInOrder(radio, { replaceQueue: true, forceSequential: false });
    notify.info(`${mood.label} \u00b7 radio`);
  };

  useEffect(() => {
    if (moodParam) {
      smoothScrollIntoView(moodSectionRef.current);
      const mood = MOODS.find((m) => m.id === moodParam);
      if (mood && trending.length > 0 && handledMoodRef.current !== moodParam) {
        playMood(mood);
        handledMoodRef.current = moodParam;
      }
    } else if (artistParam) {
      smoothScrollIntoView(mixesSectionRef.current);
    } else if (genreParam) {
      smoothScrollIntoView(genresSectionRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moodParam, artistParam, genreParam, trending.length]);

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
          <span>The Octavia Daily · Explore</span>
          <span className="text-ink-3">✦</span>
        </span>
        <span>For {firstName}</span>
      </div>

      <motion.div {...fadeUp} className="mb-10">
        <p className="eyebrow eyebrow-accent mb-3 flex items-center gap-2">
          <span className="w-6 h-px bg-track" />
          Made for you
        </p>
        <h1 className="font-display text-display-xl text-ink leading-[0.92] mask-rise">
          <span>
            Things built{' '}
            <em className="font-editorial text-track not-italic">around your taste,</em>{' '}
            {firstName}.
          </span>
        </h1>
        <p className="font-editorial text-[15px] text-ink-3 mt-4 max-w-xl leading-snug">
          Daily mixes, mood rooms, and a quiet rotation of new discoveries.
        </p>
      </motion.div>

      {/* Daily Mixes */}
      <section ref={mixesSectionRef} className="mb-14 scroll-mt-24">
        <SectionHeader
          ordinal={1}
          eyebrow="The rotation"
          title="Daily mixes"
          subtitle="Six small collections drawn from what you actually play."
        />
        <motion.div
          variants={staggerChildren(0.04)}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          {dailyMixes.length === 0 && genresLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-sharp" />
              ))
            : dailyMixes.length === 0
              ? (
                <div className="col-span-full">
                  <EmptyState
                    icon={Music2}
                    title="No mixes yet"
                    description="Like songs or play a few tracks and we'll build your daily rotation here."
                  />
                </div>
              )
              : dailyMixes.map((mix, i) => {
                const seedTracks = mix.artist
                  ? [...favorites, ...history].filter((t) => t.artist === mix.artist)
                  : [];
                const isHighlighted = artistParam && mix.artist === artistParam;
                const onPlayMix = () => {
                  if (seedTracks.length === 0) {
                    notify.info('Like more songs from this artist to play a mix');
                    return;
                  }
                  const shuffled = shuffleArray(seedTracks);
                  playTrack(shuffled[0]);
                  shuffled.slice(1).forEach((t) => addToQueue(t));
                  notify.info(`${mix.label} \u00b7 ${mix.artist}`);
                };
                return (
                <motion.button
                  type="button"
                  variants={fadeUp}
                  key={mix.id}
                  onClick={onPlayMix}
                  aria-label={`Play ${mix.label} \u2014 ${mix.artist}`}
                  className={cn(
                    'relative aspect-square rounded-sharp overflow-hidden ring-1 ring-white/[0.07] hover:ring-white/[0.18] cursor-pointer group shadow-elev-2 hover:shadow-elev-3 transition-shadow text-left focus-ring',
                    isHighlighted && 'ring-track ring-2',
                  )}
                >
                  <SmartImage
                    src={mix.thumbnail}
                    alt=""
                    kind="mix"
                    rounded="rounded-none"
                    className="absolute inset-0 w-full h-full"
                    imgClassName="object-cover group-hover:scale-105 transition-transform duration-long ease-emphasis"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                  {/* Hover-revealed play affordance */}
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="w-12 h-12 rounded-full bg-track text-track-fg flex items-center justify-center shadow-accent ring-1 ring-white/20">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </span>
                  </span>
                  {/* Top-right issue number */}
                  <span className="absolute top-3 right-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">
                    № {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="font-display text-[20px] leading-tight text-white">
                      {mix.label}
                    </p>
                    <p className="font-editorial text-[12.5px] text-white/70 truncate mt-0.5">
                      by {mix.artist}
                    </p>
                  </div>
                </motion.button>
                );
              })}
        </motion.div>
      </section>

      {/* Browse genres */}
      <section ref={genresSectionRef} className="mb-14 scroll-mt-24">
        <SectionHeader
          ordinal={2}
          eyebrow="The atlas"
          title="Browse genres"
          subtitle="Dive into a corner of music."
          link={{ to: '/genres', label: 'See all' }}
        />
        <motion.div
          variants={staggerChildren(0.04)}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          {genresLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[5/3] rounded-sharp" />
              ))
            : genresError
              ? (
                <div className="col-span-full">
                  <EmptyState
                    icon={AlertTriangle}
                    title="Genres unavailable"
                    description="We couldn't reach the genre catalog. Try again in a moment."
                    action={
                      <Button onClick={() => refetchGenres()} size="md">
                        Try again
                      </Button>
                    }
                  />
                </div>
              )
              : genres.slice(0, 6).map((g) => (
                <motion.div variants={fadeUp} key={g.id}>
                  <Link
                    to={`/genres?genre=${g.id}`}
                    className="relative block aspect-[5/3] rounded-sharp overflow-hidden p-4 border border-white/[0.08] hover:border-white/25 focus-ring transition-colors group"
                  >
                    {/* Background image if present, else gradient */}
                    {g.thumbnail ? (
                      <SmartImage
                        src={g.thumbnail}
                        alt=""
                        kind="genre"
                        rounded="rounded-none"
                        className="absolute inset-0 w-full h-full opacity-60 group-hover:opacity-75 group-hover:scale-105 transition-all duration-long ease-emphasis"
                        imgClassName="object-cover"
                      />
                    ) : (
                      <div
                        className={cn(
                          'absolute inset-0 bg-gradient-to-br opacity-80',
                          g.from || 'from-violet-500/40',
                          g.to || 'to-fuchsia-700/40',
                        )}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/20 to-transparent" />
                    <div className="relative">
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">
                        Genre
                      </p>
                      <p className="font-display text-xl text-white drop-shadow mt-1">
                        {g.label}
                      </p>
                    </div>
                  </Link>
                </motion.div>
              ))}
        </motion.div>
      </section>

      {/* Because you liked X — real rail with playable tracks.
          When the user has no favorites yet, show a tiny "start by liking
          something" prompt so the section doesn't silently disappear. */}
      {!lastLiked ? (
        <section className="mb-14">
          <SectionHeader
            ordinal={3}
            eyebrow="Adjacent"
            title="Because you liked…"
            subtitle="We'll start suggesting adjacent tracks the moment you like one."
          />
          <EmptyState
            icon={Heart}
            title="Like a song to seed this rail"
            description="Tap the heart on any track in Home or Search — we'll start recommending songs nearby."
          />
        </section>
      ) : null}
      {lastLiked && becauseList.length > 0 ? (
        <section className="mb-14">
          <SectionHeader
            ordinal={3}
            eyebrow="Adjacent"
            title={
              <>
                Because you liked{' '}
                <em className="font-editorial text-track not-italic">
                  {lastLiked.title}
                </em>
              </>
            }
            subtitle={`Tracks chosen to keep the mood close to ${lastLiked.artist}.`}
            action={
              <button
                type="button"
                onClick={playBecause}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-sharp text-[12px] font-mono uppercase tracking-[0.18em] text-ink-2 hover:text-ink border border-white/[0.10] hover:border-white/25 hover:bg-white/[0.04] transition-colors focus-ring"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Play set
              </button>
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {becauseList.map((track, i) => (
              <motion.button
                variants={fadeUp}
                initial="initial"
                animate="animate"
                key={track.id}
                type="button"
                onClick={() => handlePlay(track)}
                className="group flex items-center gap-3 p-2.5 pr-4 rounded-sharp border border-white/[0.06] bg-surface-2/50 backdrop-blur-md hover:bg-surface-2 hover:border-white/[0.12] transition-colors text-left focus-ring"
              >
                <div className="relative flex-shrink-0">
                  <SmartImage
                    src={track.thumbnail}
                    alt=""
                    kind="track"
                    rounded="rounded-sharp"
                    className="w-14 h-14 ring-1 ring-white/10"
                    imgClassName="object-cover"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 -left-1 font-display italic text-base leading-none text-bone mix-blend-difference opacity-90 group-hover:opacity-0 transition-opacity"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium truncate text-ink">{track.title}</p>
                  <p className="font-editorial text-[12.5px] text-ink-3 truncate mt-0.5">
                    by {track.artist || 'Unknown artist'}
                  </p>
                </div>
                <Play className="w-4 h-4 fill-current text-ink-3 group-hover:text-accent transition-colors" />
              </motion.button>
            ))}
          </div>
        </section>
      ) : null}

      {/* Moods — editorial plates with Fraunces drop-cap */}
      <section ref={moodSectionRef} className="mb-12 scroll-mt-24">
        <SectionHeader
          ordinal={4}
          eyebrow="Mood rooms"
          title="Whatever the hour"
          subtitle="Tap a room — we'll build a radio for it."
        />
        <motion.div
          variants={staggerChildren(0.04)}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          {MOODS.map((m, i) => {
            const isActive = moodParam === m.id;
            return (
            <motion.button
              variants={fadeUp}
              key={m.id}
              type="button"
              aria-label={`Play ${m.label} radio`}
              aria-pressed={isActive}
              onClick={() => {
                playMood(m);
                setSearchParams(
                  (prev) => {
                    const next = new URLSearchParams(prev);
                    next.set('mood', m.id);
                    return next;
                  },
                  { replace: true },
                );
              }}
              className={cn(
                'relative aspect-[5/3] rounded-sharp overflow-hidden text-left p-4 focus-ring border border-white/[0.08] hover:border-white/25 transition-colors group',
                isActive && 'border-track/60 ring-1 ring-track/40',
              )}
              style={{ background: 'hsl(var(--surface-2))' }}
            >
              <div className={cn('absolute inset-0 bg-gradient-to-br', m.mix)} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
              {/* Drop cap */}
              <span
                aria-hidden="true"
                className="absolute -top-2 -right-1 font-editorial italic text-[110px] leading-none text-white/[0.06] group-hover:text-white/10 transition-colors select-none"
                style={{ fontFeatureSettings: '"opsz" 144' }}
              >
                {m.dropCap}
              </span>
              {/* Hover-revealed play glyph */}
              <span className="absolute top-3 right-3 w-9 h-9 rounded-full bg-track text-track-fg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-accent">
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              </span>
              <div className="relative h-full flex flex-col justify-between">
                <m.icon className="w-5 h-5 text-white/85" strokeWidth={1.75} />
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/55 mb-1">
                    Mood №{String(i + 1).padStart(2, '0')}
                  </p>
                  <p className="font-display text-xl text-white">{m.label}</p>
                </div>
              </div>
            </motion.button>
            );
          })}
        </motion.div>
      </section>

      {favorites.length === 0 ? (
        <div className="mt-10 flex items-center gap-3 text-[13px] font-editorial italic text-ink-3 border-t border-white/[0.06] pt-5">
          <Heart className="w-4 h-4 text-accent not-italic" />
          Like a few songs and your mixes will get sharper.
        </div>
      ) : null}
    </div>
  );
};

export default ExplorePage;
