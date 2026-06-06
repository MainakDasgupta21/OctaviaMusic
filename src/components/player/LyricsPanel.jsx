import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Music2, Loader2, AlertTriangle, Disc3 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { activeLineIndex, parseLRC } from '@/lib/lrc';
import { getLyrics, isNotFoundError, isProviderError } from '@/lib/api';
import { queryKeys, cachePolicy } from '@/lib/query-keys';
import { usePlayer, usePlayerProgress } from '@/contexts/PlayerContext';
import EmptyState from '@/components/ui-v2/EmptyState';
import { Button } from '@/components/ui-v2/Button';
import { cn } from '@/lib/utils';

// =============================================================================
// Lyrics screen — Spotify Now-Playing inspired.
// - Bold display-weight typography (no editorial italics)
// - Big dramatic active line, dim past/future lines
// - Click any line to seek there
// - Active line auto-scrolls to center
// =============================================================================

// `2.4s` → "0:02" for screen-reader-friendly timestamps on each seek button.
const formatSeekTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

// How long auto-scroll yields after the user manually scrolls. Long enough
// that someone reading back a verse isn't yanked away by the next active-line
// change, short enough that focus eventually returns to the playhead.
const USER_SCROLL_GRACE_MS = 3500;

const LyricsPanel = () => {
  const { currentTrack, seekTo } = usePlayer();
  const { progress, duration } = usePlayerProgress();
  const scrollRef = useRef(null);
  // Timestamp of the most recent user-initiated scroll. Updated by the
  // container's `onScroll`, guarded against our own `scrollIntoView` calls
  // via the `programmaticScrollRef` flag below.
  const lastUserScrollRef = useRef(0);
  const programmaticScrollRef = useRef(false);

  const title = currentTrack?.title || '';
  const artist = currentTrack?.artist || '';
  const durationSec = duration > 0 ? duration : null;
  const enabled = Boolean(title && artist);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.lyrics(title, artist, durationSec),
    queryFn: () => getLyrics({ title, artist, durationSec: durationSec ?? undefined }),
    enabled,
    staleTime: cachePolicy.lyrics.staleTime,
    gcTime: cachePolicy.lyrics.gcTime,
    // 404 means the provider has no lyrics for this song — there's no point
    // retrying. Other errors (network/provider) are worth one or two retries.
    retry: (failureCount, err) => {
      if (isNotFoundError(err)) return false;
      return failureCount < 2;
    },
  });

  // Memoise the parse so re-renders during playback don't re-tokenise the LRC.
  const parsed = useMemo(() => {
    if (!data) return { synced: [], plain: '', instrumental: false };
    return {
      synced: parseLRC(data.syncedRaw || ''),
      plain: data.plain || '',
      instrumental: Boolean(data.instrumental),
    };
  }, [data]);

  const synced = parsed.synced;
  const idx = synced.length ? activeLineIndex(synced, progress) : -1;

  useEffect(() => {
    if (idx < 0 || !scrollRef.current) return;
    // Yield to the user for a short grace period after they manually scrolled
    // — otherwise the next active-line tick yanks the panel back and they
    // can never browse the lyric history.
    if (Date.now() - lastUserScrollRef.current < USER_SCROLL_GRACE_MS) return;
    const active = scrollRef.current.querySelector('[data-active="true"]');
    if (active) {
      programmaticScrollRef.current = true;
      active.scrollIntoView({ block: 'center', behavior: 'smooth' });
      // The smooth scroll fires more `scroll` events; clear the guard on the
      // next macrotask so the *next* genuine user scroll registers correctly.
      window.setTimeout(() => {
        programmaticScrollRef.current = false;
      }, 600);
    }
  }, [idx]);

  // Track manual scrolls. We only record them when not in the middle of our
  // own programmatic `scrollIntoView` call.
  const handleManualScroll = () => {
    if (programmaticScrollRef.current) return;
    lastUserScrollRef.current = Date.now();
  };

  if (!currentTrack) {
    return (
      <EmptyState
        icon={Music2}
        title="No track playing"
        description="Play something to see its lyrics here."
        className="py-12"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center gap-2 text-ink-3 text-[14px]">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading lyrics…
      </div>
    );
  }

  if (isError) {
    // 404 = "no lyrics available", treated as an empty state rather than an
    // error. 5xx / network failures get a retry button.
    if (isNotFoundError(error)) {
      return (
        <EmptyState
          icon={Music2}
          title="No lyrics yet"
          description="We couldn't find synced lyrics for this track."
          className="py-12"
        />
      );
    }
    const description = isProviderError(error)
      ? 'The lyrics provider is having a moment. Try again in a few seconds.'
      : 'We couldn\'t reach the lyrics service. Check your connection.';
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Lyrics unavailable"
        description={description}
        className="py-12"
        action={
          <Button variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (parsed.instrumental && !synced.length && !parsed.plain) {
    return (
      <EmptyState
        icon={Disc3}
        title="This song is instrumental"
        description="No words to follow — sit back and let the arrangement carry."
        className="py-12"
      />
    );
  }

  if (!synced.length && !parsed.plain) {
    return (
      <EmptyState
        icon={Music2}
        title="No lyrics yet"
        description="We couldn't find synced lyrics for this track."
        className="py-12"
      />
    );
  }

  if (synced.length) {
    return (
      <div
        ref={scrollRef}
        data-lenis-prevent
        onScroll={handleManualScroll}
        className="h-full overflow-y-auto custom-scrollbar px-4 py-16 space-y-1 text-left"
        style={{
          // Spotify-style fade at top/bottom so lines feel like they're "rising
          // out" and "sinking back into" the panel rather than hard-cutting.
          maskImage:
            'linear-gradient(180deg, transparent 0%, #000 14%, #000 86%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(180deg, transparent 0%, #000 14%, #000 86%, transparent 100%)',
        }}
      >
        {synced.map((line, i) => {
          const isActive = i === idx;
          const isPast = i < idx;
          const isAdjacent = Math.abs(i - idx) === 1;
          return (
            <motion.button
              key={`${i}-${line.time}`}
              type="button"
              data-active={isActive}
              onClick={() => seekTo(line.time)}
              aria-label={`Jump to ${formatSeekTime(line.time)}`}
              aria-current={isActive ? 'true' : undefined}
              animate={{
                // Inactive opacity floor bumped to 0.4 (was 0.22) so dimmed
                // lines still clear WCAG AA against the panel background;
                // the active line at 1.0 keeps its dramatic contrast.
                opacity: isActive ? 1 : isPast ? 0.4 : isAdjacent ? 0.7 : 0.5,
                scale: isActive ? 1.04 : 1,
              }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              style={{
                // Soft ember glow on the active line — a gentle text-shadow
                // tinted by the album accent. Quietly turned off for the
                // non-active rows. Pairs with the 1.04× scale above so the
                // current line truly "reads" as the focal point.
                textShadow: isActive
                  ? '0 0 14px hsl(var(--track-accent) / 0.45), 0 0 30px hsl(var(--track-accent) / 0.20)'
                  : undefined,
                transformOrigin: 'left center',
              }}
              className={cn(
                'block w-full text-left px-2 py-2 rounded-lg font-display tracking-tight leading-[1.18] focus-ring transition-colors',
                isActive
                  ? 'text-white font-bold text-[24px] md:text-[28px]'
                  : 'text-ink-2 hover:text-ink font-semibold text-[19px] md:text-[22px]',
              )}
            >
              {line.text || '\u00a0'}
            </motion.button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      data-lenis-prevent
      className="h-full overflow-y-auto custom-scrollbar px-5 py-10"
      style={{
        maskImage:
          'linear-gradient(180deg, transparent 0%, #000 8%, #000 92%, transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(180deg, transparent 0%, #000 8%, #000 92%, transparent 100%)',
      }}
    >
      <pre className="whitespace-pre-wrap font-display font-semibold text-[19px] md:text-[20px] text-ink-2 leading-[1.45] tracking-tight">
        {parsed.plain}
      </pre>
    </div>
  );
};

export default LyricsPanel;
