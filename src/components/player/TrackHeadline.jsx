import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayer } from '@/contexts/PlayerContext';
import HeartButton from '@/components/HeartButton';
import AddToPlaylistButton from '@/components/playlist/AddToPlaylistButton';
import { durations, easings, isReducedMotion } from '@/design/motion';
import { artistSlug } from '@/lib/player-format';

const TrackHeadline = () => {
  const { currentTrack } = usePlayer();

  const split = useMemo(() => {
    const raw = (currentTrack?.title || '').trim();
    if (!raw) return { headline: 'Untitled', subhead: '' };
    const bracket = raw.match(/^(.*?)(\s*\[[^\]]+\]\s*)$/);
    if (bracket) {
      return { headline: bracket[1].trim(), subhead: bracket[2].trim() };
    }
    const paren = raw.match(/^(.*?)(\s*\([^)]+\)\s*)$/);
    if (paren && paren[1].length > 4) {
      return { headline: paren[1].trim(), subhead: paren[2].trim() };
    }
    return { headline: raw, subhead: '' };
  }, [currentTrack?.title]);

  if (!currentTrack) return null;

  const slug = artistSlug(currentTrack);
  const album = currentTrack.album || 'Single';
  const trackKey = currentTrack.id || `${currentTrack.title}-${currentTrack.artist}`;
  const reduceMotion = isReducedMotion();

  return (
    <div className="w-full min-w-0">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={trackKey}
          initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: {
              duration: reduceMotion ? 0 : durations.short,
              ease: easings.emphasis,
            },
          }}
          exit={{
            opacity: 0,
            y: reduceMotion ? 0 : -6,
            transition: {
              duration: reduceMotion ? 0 : durations.short,
              ease: easings.accel,
            },
          }}
          className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
        >
          <div className="min-w-0 flex-1 max-w-[48ch]">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-4/90">
              Now playing
            </p>

            <h1
              className="np-title mt-2 font-display font-semibold leading-[1.05] tracking-tightest text-ink [text-wrap:balance]"
              style={{ fontSize: 'clamp(30px, min(4.2vw, 5.2vh), 44px)' }}
            >
              <span className="block">{split.headline}</span>
              {split.subhead ? (
                <span className="mt-1 block text-[0.56em] font-medium leading-[1.16] tracking-[-0.01em] text-ink-2">
                  {split.subhead}
                </span>
              ) : null}
            </h1>

            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-body text-ink-2">
              <Link
                to={slug ? `/artist/${slug}` : '#'}
                className="rounded-sm font-medium text-track underline decoration-1 decoration-white/15 underline-offset-[6px] transition-colors hover:decoration-accent focus-ring"
              >
                {currentTrack.artist || 'Unknown artist'}
              </Link>
              <span aria-hidden="true" className="text-ink-4">•</span>
              {currentTrack.albumId ? (
                <Link
                  to={`/album/${currentTrack.albumId}`}
                  className="rounded-sm text-ink-3 underline decoration-1 decoration-transparent underline-offset-[6px] transition-colors hover:text-ink hover:decoration-white/20 focus-ring"
                >
                  {album}
                </Link>
              ) : (
                <span className="text-ink-3">{album}</span>
              )}
            </p>
          </div>

          <div className="mt-0.5 shrink-0 flex items-center gap-2 self-start sm:self-auto">
            <AddToPlaylistButton
              track={currentTrack}
              className="border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
              align="end"
              side="bottom"
              sideOffset={10}
              buttonLabel={`Add ${currentTrack.title || 'current track'} to playlist`}
            />
            <HeartButton
              track={currentTrack}
              size="md"
              className="border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]"
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default TrackHeadline;
