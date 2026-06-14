import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import ChartColumnHeaders from '@/components/charts/ChartColumnHeaders';
import ChartRowSkeleton from '@/components/charts/ChartRowSkeleton';
import ChartRowSong from '@/components/charts/ChartRowSong';
import ChartRowArtist from '@/components/charts/ChartRowArtist';
import ChartsErrorState from '@/components/charts/ChartsErrorState';
import ChartsEmptyState from '@/components/charts/ChartsEmptyState';

const INITIAL_PAGE_SIZE = 20;
const PAGE_STEP = 20;

const ChartsList = ({
  mode,
  window,
  listKey,
  rows,
  isLoading,
  isError,
  onRetry,
  sortColumn,
  sortDirection,
  onSort,
  currentTrackId,
  isPlaying,
  onPlaySong,
  onShareSong,
  onFavoriteSong,
  onSongGoAlbum,
  onSongGoArtist,
  onShareArtist,
  expandedArtistRows,
  onToggleArtistRow,
  onPlayArtistTrack,
}) => {
  const [visibleCount, setVisibleCount] = useState(INITIAL_PAGE_SIZE);
  const [isPaginating, setIsPaginating] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    setVisibleCount(INITIAL_PAGE_SIZE);
    setIsPaginating(false);
  }, [listKey]);

  const visibleRows = useMemo(() => rows.slice(0, visibleCount), [rows, visibleCount]);
  const canLoadMore = visibleCount < rows.length;

  useEffect(() => {
    if (!canLoadMore || isLoading) return undefined;
    const node = sentinelRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting || isPaginating) return;
        setIsPaginating(true);
        window.setTimeout(() => {
          setVisibleCount((count) => Math.min(rows.length, count + PAGE_STEP));
          setIsPaginating(false);
        }, 220);
      },
      { rootMargin: '320px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canLoadMore, isLoading, isPaginating, rows.length]);

  if (isError) {
    return <ChartsErrorState onRetry={onRetry} />;
  }

  if (!isLoading && rows.length === 0) {
    return <ChartsEmptyState />;
  }

  return (
    <div
      id="charts-results-panel"
      role="tabpanel"
      className="rounded-soft border border-white/[0.08] bg-surface-2/40 backdrop-blur-md overflow-hidden"
    >
      <ChartColumnHeaders
        mode={mode}
        window={window}
        sortColumn={sortColumn}
        sortDirection={sortDirection}
        onSort={onSort}
      />

      <AnimatePresence mode="wait" initial={false}>
        {isLoading ? (
          <motion.div
            key={`${mode}-skeleton`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 10 }).map((_, idx) => (
              <ChartRowSkeleton key={idx} mode={mode} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key={`${mode}-rows-${listKey}`}
            role="list"
            aria-label={mode === 'songs' ? 'Top songs chart' : 'Top artists chart'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.2 } }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
          >
            {visibleRows.map((entry) =>
              mode === 'songs' ? (
                <ChartRowSong
                  key={entry.id}
                  entry={entry}
                  isCurrent={currentTrackId === entry.id}
                  // Only the current row cares about isPlaying; giving every
                  // other row a stable `false` lets memo skip them on play/pause.
                  isPlaying={currentTrackId === entry.id ? isPlaying : false}
                  onPlay={onPlaySong}
                  onShare={onShareSong}
                  onAddFavorite={onFavoriteSong}
                  onGoAlbum={onSongGoAlbum}
                  onGoArtist={onSongGoArtist}
                />
              ) : (
                <ChartRowArtist
                  key={entry.id}
                  entry={entry}
                  expanded={expandedArtistRows.has(entry.id)}
                  onToggleExpand={onToggleArtistRow}
                  onPlayTrack={onPlayArtistTrack}
                  onShare={onShareArtist}
                />
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!isLoading ? (
        <div ref={sentinelRef} aria-hidden="true" className="h-1" />
      ) : null}

      {!isLoading && isPaginating ? (
        <div className="py-4 flex items-center justify-center text-ink-4 text-xs font-mono uppercase tracking-[0.16em]">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          Loading more
        </div>
      ) : null}
    </div>
  );
};

export default ChartsList;
