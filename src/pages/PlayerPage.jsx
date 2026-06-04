import { useEffect } from 'react';
import NowPlaying from '@/components/player/NowPlaying';

// Thin route wrapper around the canonical now-playing surface.
// Owns only the page-level concern: hard-locking document scroll while the
// `/player` route is mounted. The footer-player gutter (pb-[104px]) and all
// hero content live inside <NowPlaying variant="page" />.
const PlayerPage = () => {
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const { documentElement, body } = document;
    const prevHtmlOverflow = documentElement.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    documentElement.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      documentElement.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, []);

  return <NowPlaying variant="page" />;
};

export default PlayerPage;
