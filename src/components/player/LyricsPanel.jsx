import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Music2, Loader2, AlertTriangle } from 'lucide-react';
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

const LyricsPanel = () => {
  const { currentTrack, seekTo } = usePlayer();
  const { progress, duration } = usePlayerProgress();
  const scrollRef = useRef(null);

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
    if (!data) return { synced: [], plain: '' };
    return {
      synced: parseLRC(data.syncedRaw || ''),
      plain: data.plain || '',
    };
  }, [data]);

  const synced = parsed.synced;
  const idx = synced.length ? activeLineIndex(synced, progress) : -1;

  useEffect(() => {
    if (idx < 0 || !scrollRef.current) return;
    const active = scrollRef.current.querySelector('[data-active="true"]');
    if (active) {
      active.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [idx]);

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
              animate={{
                opacity: isActive ? 1 : isPast ? 0.22 : isAdjacent ? 0.55 : 0.35,
              }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
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
