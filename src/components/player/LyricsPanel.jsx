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
import Skeleton from '@/components/ui-v2/Skeleton';
import { cn } from '@/lib/utils';

// `2.4s` → "0:02" for screen-reader-friendly timestamps on each seek button.
const formatSeekTime = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const USER_SCROLL_GRACE_MS = 3500;

const LyricsPanel = () => {
  const { currentTrack, seekTo } = usePlayer();
  const { progress, duration } = usePlayerProgress();
  const scrollRef = useRef(null);
  const lastUserScrollRef = useRef(0);
  const programmaticScrollRef = useRef(false);

  const title = currentTrack?.title || '';
  const artist = currentTrack?.artist || '';
  const videoId = currentTrack?.videoId || currentTrack?.id || '';
  const durationSec = duration > 0 ? duration : null;
  const enabled = Boolean((title && artist) || videoId);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.lyrics(title, artist, durationSec, videoId),
    queryFn: () =>
      getLyrics({
        title,
        artist,
        videoId,
        durationSec: durationSec ?? undefined,
      }),
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
    if (Date.now() - lastUserScrollRef.current < USER_SCROLL_GRACE_MS) return;
    const active = scrollRef.current.querySelector('[data-active="true"]');
    if (active) {
      programmaticScrollRef.current = true;
      active.scrollIntoView({ block: 'center', behavior: 'smooth' });
      window.setTimeout(() => {
        programmaticScrollRef.current = false;
      }, 600);
    }
  }, [idx]);

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
      <div className="h-full overflow-y-auto custom-scrollbar px-4 py-7 sm:px-5 sm:py-9 space-y-3">
        <div className="flex items-center justify-center gap-2 text-ink-3 text-[13px] mb-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Syncing lyrics…
        </div>
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton
            key={`lyrics-skeleton-${index}`}
            className={cn(
              'h-7 rounded-sharp',
              index % 3 === 0 && 'w-[86%]',
              index % 3 === 1 && 'w-[72%]',
              index % 3 === 2 && 'w-[64%]',
            )}
          />
        ))}
      </div>
    );
  }

  if (isError) {
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
        className="h-full overflow-y-auto custom-scrollbar px-4 py-7 text-left sm:px-5 sm:py-9 space-y-1"
        style={{
          maskImage:
            'linear-gradient(180deg, transparent 0%, #000 12%, #000 88%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(180deg, transparent 0%, #000 12%, #000 88%, transparent 100%)',
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
                opacity: isActive ? 1 : isPast ? 0.44 : isAdjacent ? 0.72 : 0.58,
                scale: isActive ? 1.01 : 1,
              }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              style={{
                textShadow: isActive
                  ? '0 0 16px hsl(var(--track-accent) / 0.24)'
                  : undefined,
                transformOrigin: 'left center',
              }}
              className={cn(
                'block w-full rounded-lg px-2 py-1.5 text-left font-display leading-[1.2] tracking-tight transition-colors focus-ring',
                isActive
                  ? 'text-ink font-semibold text-[21px] md:text-[23px]'
                  : 'font-medium text-[16.5px] md:text-[18px] text-ink-3 hover:text-ink-2',
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
      className="h-full overflow-y-auto custom-scrollbar px-4 py-7 sm:px-5 sm:py-8"
      style={{
        maskImage:
          'linear-gradient(180deg, transparent 0%, #000 8%, #000 92%, transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(180deg, transparent 0%, #000 8%, #000 92%, transparent 100%)',
      }}
    >
      <pre className="whitespace-pre-wrap font-display font-medium text-[17px] md:text-[19px] text-ink-2 leading-[1.55] tracking-tight">
        {parsed.plain}
      </pre>
    </div>
  );
};

export default LyricsPanel;
