import { useEffect, useState } from 'react';

// =============================================================================
// usePlaybackLoading
// -----------------------------------------------------------------------------
// Heuristic "track is buffering" signal. ReactPlayer's YouTube backend doesn't
// surface a reliable buffering event for us to subscribe to, so we infer the
// state from `currentTrack.id` changes vs. observed `progress`:
//
// 1. When `currentTrack.id` changes, flip `isLoading` on.
// 2. When `progress` advances past a tiny threshold, flip it off.
// 3. As a safety net, flip it off after `maxMs` (1.5s) so a quiet track that
//    legitimately starts at 0 doesn't permanently shimmer.
//
// Consumers (FooterPlayer / NowPlaying) light up a shimmer on the seekbar and
// pulse the track title until the signal clears.
// =============================================================================

const DEFAULT_MAX_MS = 1500;
const PROGRESS_THRESHOLD_S = 0.25;

export const usePlaybackLoading = ({ trackId, progress, maxMs = DEFAULT_MAX_MS } = {}) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!trackId) {
      setIsLoading(false);
      return undefined;
    }
    setIsLoading(true);
    // Safety net so we never shimmer forever — e.g. if YouTube quietly
    // resumes a paused track at exactly position 0.
    const t = setTimeout(() => setIsLoading(false), maxMs);
    return () => clearTimeout(t);
  }, [trackId, maxMs]);

  useEffect(() => {
    if (!isLoading) return;
    if (Number.isFinite(progress) && progress > PROGRESS_THRESHOLD_S) {
      setIsLoading(false);
    }
  }, [isLoading, progress]);

  return isLoading;
};

export default usePlaybackLoading;
