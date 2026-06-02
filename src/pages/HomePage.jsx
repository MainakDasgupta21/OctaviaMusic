import { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Play,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useSettings } from '@/contexts/SettingsContext';
import HeartButton from '@/components/HeartButton';
import Button from '@/components/ui-v2/Button';
import SectionHeader from '@/components/ui-v2/SectionHeader';
import Skeleton from '@/components/ui-v2/Skeleton';
import { getHomeFeatured, getTrending } from '@/lib/api';
import { fadeUp, staggerChildren } from '@/design/motion';

const getGreeting = (hour) => {
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Good night';
};

const slugify = (name) =>
  (name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const formatMasthead = () => {
  const d = new Date();
  const fmt = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
  return fmt.toUpperCase();
};

// =============================================================================
// Reusable bits.
// =============================================================================

/**
 * Editorial hero. The feature acts like the cover story of an issue: oversized
 * serif headline, asymmetric right-margin "feature/issue" strip, and a
 * confident two-button CTA pair (solid primary + editorial ghost).
 */
const HeroCard = ({ feature, onPlay, issueNum }) => (
  <motion.section
    {...fadeUp}
    className="relative overflow-hidden rounded-soft ring-1 ring-white/[0.08] shadow-elev-5"
    style={{ minHeight: '460px' }}
  >
    <img
      src={feature.cover}
      alt=""
      aria-hidden="true"
      className="absolute inset-0 w-full h-full object-cover scale-105"
    />
    {/* Cinematic ink gradient — left→right reveal of text region. */}
    <div className="absolute inset-0 bg-gradient-to-r from-background via-background/82 via-50% to-transparent" />
    <div
      aria-hidden="true"
      className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/20 to-transparent"
    />
    {/* Subtle ember bloom anchored to the lower-left, matches track accent. */}
    <div
      aria-hidden="true"
      className="absolute -bottom-32 -left-32 w-[480px] h-[480px] rounded-full opacity-50 blur-3xl"
      style={{ background: 'hsl(var(--track-accent) / 0.35)' }}
    />

    {/* Right-margin editorial strip — issue / feature / date */}
    <div
      aria-hidden="true"
      className="hidden md:flex absolute top-0 right-0 bottom-0 w-12 flex-col items-center justify-between py-8 border-l border-white/[0.08] bg-background/20 backdrop-blur-[2px]"
    >
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-3 [writing-mode:vertical-rl] rotate-180">
        Feature · {issueNum}
      </span>
      <span aria-hidden="true" className="text-ink-4 text-sm">✦</span>
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-4 [writing-mode:vertical-rl] rotate-180">
        Cover Story
      </span>
    </div>

    <div className="relative h-full p-7 md:p-12 md:pr-24 flex flex-col justify-end gap-7 max-w-3xl">
      <div className="flex items-center gap-3">
        <span className="issue-pill">
          <span className="w-1.5 h-1.5 rounded-full bg-track" />
          {feature.eyebrow || 'On Rotation'}
        </span>
        <span className="hidden sm:inline font-editorial text-[13px] text-ink-3">
          {feature.label || 'Daily feature'}
        </span>
      </div>
      <div>
        <h2 className="font-display text-display-xl text-ink leading-[0.92] mb-4 max-w-2xl">
          {feature.title}
        </h2>
        <p className="font-editorial text-ink-2 text-base md:text-lg max-w-lg leading-snug">
          {feature.description}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          onClick={onPlay}
          leftIcon={<Play className="w-5 h-5 fill-current" />}
        >
          Play feature
        </Button>
        <Link to={feature.to}>
          <Button variant="editorial" size="lg" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Read more
          </Button>
        </Link>
      </div>
    </div>
  </motion.section>
);

const HeroSkeleton = () => (
  <div
    className="relative overflow-hidden rounded-soft ring-1 ring-white/[0.08] bg-surface-2/60"
    style={{ minHeight: '460px' }}
  >
    <div className="absolute inset-x-0 bottom-0 p-7 md:p-12 space-y-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  </div>
);

const HorizontalRail = ({ children, className = '' }) => {
  const ref = useRef(null);

  const scroll = (dx) => {
    ref.current?.scrollBy({ left: dx, behavior: 'smooth' });
  };

  return (
    <div className="relative group/rail">
      <div
        ref={ref}
        className={`flex gap-5 overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-pl-6 -mx-2 px-2 ${className}`}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => scroll(-440)}
        aria-label="Scroll left"
        className="absolute -left-4 top-[42%] -translate-y-1/2 w-9 h-9 rounded-sharp bg-surface-3/85 backdrop-blur-md border border-white/[0.10] text-ink-2 hover:text-ink hover:border-white/25 opacity-0 group-hover/rail:opacity-100 transition-all flex items-center justify-center focus-ring"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => scroll(440)}
        aria-label="Scroll right"
        className="absolute -right-4 top-[42%] -translate-y-1/2 w-9 h-9 rounded-sharp bg-surface-3/85 backdrop-blur-md border border-white/[0.10] text-ink-2 hover:text-ink hover:border-white/25 opacity-0 group-hover/rail:opacity-100 transition-all flex items-center justify-center focus-ring"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

/**
 * Refined tile. Adds a track number overlay (1..N) in italic serif for the
 * editorial column feel. Hover state lifts AND adds a hairline accent ring.
 */
const TileCard = ({ track, onPlay, isCurrent, index }) => (
  <button
    type="button"
    onClick={onPlay}
    className="relative group flex-shrink-0 w-44 snap-start text-left focus-ring rounded-sharp"
  >
    <div className="relative aspect-square rounded-sharp overflow-hidden ring-1 ring-white/[0.06] shadow-elev-2 card-hover">
      <img
        src={track.thumbnail}
        alt={track.title}
        className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-long ease-emphasis"
      />
      {/* Track ordinal — italic serif in the corner. Hidden on hover for the
          play button to dominate. */}
      {typeof index === 'number' ? (
        <span
          aria-hidden="true"
          className="absolute top-2 left-2.5 font-editorial text-ink leading-none text-2xl mix-blend-difference opacity-90 group-hover:opacity-0 transition-opacity"
        >
          {String(index + 1).padStart(2, '0')}
        </span>
      ) : null}
      {/* Subtle ink overlay on hover so the play button stands out. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-short" />
    </div>
    <span className="absolute bottom-[58px] right-3 w-10 h-10 rounded-full gradient-accent text-track-fg flex items-center justify-center shadow-accent ring-1 ring-white/20 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-short ease-emphasis"
      style={{
        backgroundImage:
          'radial-gradient(circle at 30% 25%, hsl(var(--ink-primary) / 0.22), transparent 55%), linear-gradient(135deg, hsl(var(--track-accent)), hsl(var(--track-accent-strong)))',
      }}
    >
      <Play className="w-4 h-4 fill-current ml-0.5" />
    </span>
    <div className="mt-3.5 min-w-0">
      <p className={`text-[14px] font-medium truncate ${isCurrent ? 'text-accent' : 'text-ink'}`}>
        {track.title}
      </p>
      <p className="font-editorial text-[12.5px] text-ink-3 truncate mt-0.5">
        {track.artist}
      </p>
    </div>
  </button>
);

const TileSkeleton = () => (
  <div className="flex-shrink-0 w-44">
    <Skeleton className="aspect-square rounded-sharp" />
    <Skeleton className="h-4 w-3/4 mt-3" />
    <Skeleton className="h-3 w-1/2 mt-2" />
  </div>
);

const ArtistCircle = ({ artist, sample, slug }) => (
  <Link
    to={`/artist/${slug || slugify(artist)}`}
    className="flex-shrink-0 w-36 text-center group snap-start focus-ring rounded-sharp"
  >
    <div className="aspect-square rounded-full overflow-hidden ring-1 ring-white/[0.08] bg-surface-2 group-hover:ring-track/50 transition-all duration-short shadow-elev-1 group-hover:shadow-elev-3">
      {sample ? (
        <img
          src={sample}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-long ease-emphasis"
        />
      ) : (
        <div className="w-full h-full" />
      )}
    </div>
    <p className="mt-3 text-[13px] font-medium truncate text-ink">{artist}</p>
    <p className="font-editorial text-[11.5px] text-ink-3">Artist</p>
  </Link>
);

// =============================================================================
// Page
// =============================================================================

const HomePage = () => {
  const { history, playTrack, currentTrack, isPlaying } = usePlayer();
  const { list: favorites } = useFavorites();
  const { settings } = useSettings();

  const greeting = useMemo(() => getGreeting(new Date().getHours()), []);
  const firstName = (settings.displayName || '').split(' ')[0] || 'there';
  const masthead = useMemo(() => formatMasthead(), []);
  const issueNum = useMemo(() => {
    // Day-of-year as a faux "issue number". Adds a tiny editorial detail
    // that changes daily without needing a backend.
    const start = new Date(new Date().getFullYear(), 0, 0);
    const diff = Date.now() - start.getTime();
    return String(Math.floor(diff / 86_400_000)).padStart(3, '0');
  }, []);

  const { data: featured = [], isLoading: featuredLoading } = useQuery({
    queryKey: ['home', 'featured'],
    queryFn: getHomeFeatured,
  });

  const { data: trending = [], isLoading: trendingLoading } = useQuery({
    queryKey: ['trending', 'home'],
    queryFn: () => getTrending({ limit: 12 }),
  });

  // Hero rotates by day-of-week so subsequent visits feel fresh.
  const hero = useMemo(() => {
    if (!featured.length) return null;
    const idx = new Date().getDay() % featured.length;
    return featured[idx];
  }, [featured]);

  // Daily Mixes derive from top artists in recent listening.
  const dailyMixes = useMemo(() => {
    const seed = [...history, ...favorites];
    const counts = new Map();
    seed.forEach((t) => {
      if (!t?.artist) return;
      counts.set(t.artist, (counts.get(t.artist) || 0) + 1);
    });
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return top.map(([artist], i) => {
      const sample = seed.find((t) => t.artist === artist);
      return {
        id: `dm-${i}`,
        label: `Daily Mix ${i + 1}`,
        artist,
        thumbnail: sample?.thumbnail || 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
      };
    });
  }, [history, favorites]);

  const topArtists = useMemo(() => {
    const byArtist = new Map();
    history.forEach((t) => {
      if (!t?.artist) return;
      const entry = byArtist.get(t.artist) || { count: 0, sample: null, slug: null };
      entry.count += 1;
      entry.sample = entry.sample || t.thumbnail;
      entry.slug = entry.slug || t.artistSlug || null;
      byArtist.set(t.artist, entry);
    });
    return Array.from(byArtist.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([artist, info]) => ({ artist, sample: info.sample, slug: info.slug }));
  }, [history]);

  return (
    <div className="p-5 md:p-10 max-w-[1600px] mx-auto">
      {/* ============================================================
          MASTHEAD — date / vol / issue. The page-as-newspaper signal.
          ============================================================ */}
      <div
        aria-hidden="true"
        className="hidden md:flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.22em] text-ink-4 mb-8 pb-3 border-b border-white/[0.08]"
      >
        <span>{masthead}</span>
        <span className="flex items-center gap-3">
          <span className="text-ink-3">✦</span>
          <span>The Harmony Hub Daily</span>
          <span className="text-ink-3">✦</span>
        </span>
        <span>Vol. 01 · No. {issueNum}</span>
      </div>

      {/* ============================================================
          GREETING — editorial display with italic emphasis.
          ============================================================ */}
      <motion.div
        {...fadeUp}
        className="mb-10 grid md:grid-cols-[1fr_auto] gap-6 md:gap-10 items-end"
      >
        <div>
          <p className="eyebrow eyebrow-accent mb-3 flex items-center gap-2">
            <span className="w-6 h-px bg-track" />
            {greeting}, {firstName}
          </p>
          <h1 className="font-display text-display-xl text-ink leading-[0.92]">
            Today, the music{' '}
            <span className="font-editorial text-track">listens back.</span>
          </h1>
        </div>
        <div className="hidden md:flex items-baseline gap-3 pb-2">
          <span className="editorial-num text-7xl">{issueNum}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-4 pb-2">
            Issue
          </span>
        </div>
      </motion.div>

      {/* ============================================================
          HERO — cover story
          ============================================================ */}
      <div className="mb-14">
        {featuredLoading || !hero ? (
          <HeroSkeleton />
        ) : (
          <HeroCard
            feature={hero}
            issueNum={issueNum}
            onPlay={() => hero.track && playTrack(hero.track)}
          />
        )}
      </div>

      {/* ============================================================
          JUMP BACK IN
          ============================================================ */}
      {history.length > 0 && (
        <section className="mb-14">
          <SectionHeader
            ordinal={1}
            eyebrow="Continued"
            title="Pick up where you left off"
            subtitle="Recent tracks, ready to resume — exactly where the needle lifted."
            to="/library"
          />
          <HorizontalRail>
            {history.slice(0, 12).map((track, i) => (
              <TileCard
                key={track.id}
                track={track}
                index={i}
                onPlay={() => playTrack(track)}
                isCurrent={currentTrack?.id === track.id}
                isPlaying={isPlaying}
              />
            ))}
          </HorizontalRail>
        </section>
      )}

      {/* ============================================================
          TRENDING NOW
          ============================================================ */}
      <section className="mb-14">
        <SectionHeader
          ordinal={2}
          eyebrow="Trending"
          title="The world's on rotation"
          subtitle="Hot tracks rising right now, refreshed every hour."
          to="/trending"
        />
        <HorizontalRail>
          {trendingLoading
            ? Array.from({ length: 8 }).map((_, i) => <TileSkeleton key={i} />)
            : trending.map((track, i) => (
                <TileCard
                  key={track.id}
                  track={track}
                  index={i}
                  onPlay={() => playTrack(track)}
                  isCurrent={currentTrack?.id === track.id}
                  isPlaying={isPlaying}
                />
              ))}
        </HorizontalRail>
      </section>

      {/* ============================================================
          MADE FOR YOU
          ============================================================ */}
      {dailyMixes.length > 0 && (
        <section className="mb-14">
          <SectionHeader
            ordinal={3}
            eyebrow="Made for you"
            title="The mixes that know your habits"
            subtitle="Built from the artists you actually play. No fillers."
            to="/explore"
          />
          <motion.div
            variants={staggerChildren(0.05)}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {dailyMixes.map((mix, i) => (
              <motion.div variants={fadeUp} key={mix.id}>
                <Link
                  to="/explore"
                  className="relative block aspect-square rounded-sharp overflow-hidden card-hover focus-ring group ring-1 ring-white/[0.06]"
                >
                  <img
                    src={mix.thumbnail}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-long ease-emphasis"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  <span
                    aria-hidden="true"
                    className="absolute top-3 left-3 font-mono text-[10px] tracking-[0.2em] text-white/70"
                  >
                    №{String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="font-display text-xl leading-tight text-white">
                      {mix.label}
                    </p>
                    <p className="font-editorial text-[12px] text-white/70 truncate mt-0.5">
                      built around {mix.artist}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* ============================================================
          TOP ARTISTS
          ============================================================ */}
      {topArtists.length > 0 && (
        <section className="mb-14">
          <SectionHeader
            ordinal={4}
            eyebrow="Your rotation"
            title="The voices in your year"
            subtitle="Aggregated from the last few weeks of listening."
          />
          <HorizontalRail>
            {topArtists.map((a) => (
              <ArtistCircle
                key={a.artist}
                artist={a.artist}
                sample={a.sample}
                slug={a.slug}
              />
            ))}
          </HorizontalRail>
        </section>
      )}

      {/* ============================================================
          CHARTS CTA — editorial slab
          ============================================================ */}
      <section className="mb-12">
        <Link
          to="/charts"
          className="relative block rounded-soft overflow-hidden p-7 md:p-10 group focus-ring ring-1 ring-white/[0.07] hover:ring-track/40 transition-all duration-med"
          style={{
            background:
              'radial-gradient(ellipse 80% 100% at 0% 0%, hsl(var(--track-accent) / 0.30), transparent 60%), radial-gradient(ellipse 60% 60% at 100% 100%, hsl(var(--oxblood) / 0.50), transparent 60%), hsl(var(--surface-2))',
          }}
        >
          <div className="relative flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-accent" strokeWidth={2} />
                <span className="eyebrow eyebrow-accent">What the world plays</span>
              </div>
              <p className="font-display text-3xl md:text-[44px] text-ink leading-[1.02] tracking-tight">
                Five hundred million<br />
                <span className="font-editorial text-bone">listeners can't all be wrong.</span>
              </p>
              <p className="font-editorial text-[14px] text-ink-2 mt-4 max-w-md leading-relaxed">
                Charts update every hour — sorted by region, genre, and the
                window of time that matters to you.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="eyebrow text-ink-3">Open the charts</span>
              <ArrowRight className="w-5 h-5 text-ink-3 group-hover:text-accent group-hover:translate-x-1 transition-all duration-short" />
            </div>
          </div>
        </Link>
      </section>

      {/* Editorial footer note */}
      <div className="mt-16 pt-6 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-ink-4">
        <span>End of feed · {masthead}</span>
        <span className="hidden md:inline">Harmony Hub · An editorial product</span>
      </div>

      {/* Empty-state hint when the user has nothing yet */}
      {history.length === 0 && favorites.length === 0 ? (
        <p className="font-editorial text-[13px] text-ink-3 text-center mt-6">
          Like a few songs and the page will tailor itself to your taste.
        </p>
      ) : null}
    </div>
  );
};

export default HomePage;
