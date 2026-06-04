import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { usePlayer } from '@/contexts/PlayerContext';
import HeartButton from '@/components/HeartButton';
import { artistSlug } from '@/lib/player-format';

// Premium title block.
// - Splits bracketed subtitles ("Title [Subtitle]") onto a second line.
// - Never truncates: the headline wraps and is balanced.
// - Quiet artist / album line beneath, with the artist tinted in the album
//   accent (the standard Apple Music affordance).
const TrackHeadline = ({ onNavigate }) => {
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
  const handleNavigate = () => onNavigate?.();
  const album = currentTrack.album || 'Single';

  return (
    <div className="w-full min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-ink-3">
            <span
              aria-hidden="true"
              className="relative inline-flex h-1.5 w-1.5 rounded-full bg-track"
            >
              <span className="absolute inset-0 rounded-full bg-track animate-ping opacity-70" />
            </span>
            Now playing
          </p>

          <h1
            className="np-title mt-3 font-display font-semibold text-ink leading-[1.04] tracking-[-0.025em] [text-wrap:balance]"
            style={{ fontSize: 'clamp(28px, min(5vh, 3.2vw), 48px)' }}
          >
            <span className="block">{split.headline}</span>
            {split.subhead ? (
              <span className="block mt-1 text-[0.6em] leading-[1.18] tracking-[-0.01em] text-ink-2 font-medium">
                {split.subhead}
              </span>
            ) : null}
          </h1>

          <p className="mt-3 text-[14.5px] text-ink-2 truncate">
            <Link
              to={slug ? `/artist/${slug}` : '#'}
              onClick={handleNavigate}
              // Premium link treatment — always-on hairline underline at
              // 6px offset, ink-quaternary by default, lifts to accent on
              // hover. Reads as "this is a link" without competing with
              // the title typography above.
              className="text-track underline decoration-1 underline-offset-[6px] decoration-white/15 hover:decoration-accent transition-colors focus-ring rounded-sm font-medium"
            >
              {currentTrack.artist || 'Unknown artist'}
            </Link>
            <span className="text-ink-4 mx-1.5">·</span>
            {currentTrack.albumId ? (
              <Link
                to={`/album/${currentTrack.albumId}`}
                onClick={handleNavigate}
                className="text-ink-3 underline decoration-1 underline-offset-[6px] decoration-transparent hover:decoration-white/20 hover:text-ink transition-colors focus-ring rounded-sm"
              >
                {album}
              </Link>
            ) : (
              <span className="text-ink-3">{album}</span>
            )}
          </p>
        </div>

        <HeartButton track={currentTrack} size="lg" className="shrink-0 mt-0.5" />
      </div>
    </div>
  );
};

export default TrackHeadline;
