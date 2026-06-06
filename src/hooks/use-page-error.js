import { useMemo } from 'react';
import { AlertTriangle, CloudOff, WifiOff, ServerCrash, FileQuestion } from 'lucide-react';
import { isNetworkError, isNotFoundError, isProviderError } from '@/lib/api';

// =============================================================================
// usePageError(error, { resource, notFoundCopy })
// -----------------------------------------------------------------------------
// Single source of truth for translating a React Query error into a user-facing
// `{ icon, title, description }` triple. Distinguishes:
//   - network errors          ("You're offline")
//   - upstream/provider errors (5xx → "The service is having a moment")
//   - 404                      ("We couldn't find this")
//   - other                    (generic catalog error)
//
// Use across detail pages (Album, Artist, Playlist) and list pages
// (Charts, Trending, Genres, Explore) so the error voice is consistent.
// =============================================================================

const DEFAULT_RESOURCE = 'this';

export const usePageError = (error, options = {}) => {
  const { resource = DEFAULT_RESOURCE, notFoundCopy } = options;

  return useMemo(() => {
    if (!error) return null;

    if (isNotFoundError(error)) {
      return {
        icon: FileQuestion,
        kind: 'not-found',
        title: notFoundCopy?.title || `We couldn't find ${resource}`,
        description:
          notFoundCopy?.description ||
          `That page doesn't exist (or isn't indexed yet).`,
      };
    }

    if (isNetworkError(error)) {
      return {
        icon: WifiOff,
        kind: 'network',
        title: "You're offline",
        description:
          "Check your connection and try again. Cached pages still work in the meantime.",
      };
    }

    if (isProviderError(error)) {
      return {
        icon: ServerCrash,
        kind: 'provider',
        title: 'The service is having a moment',
        description:
          "Our catalog upstream is temporarily unhappy. Give it a few seconds and retry.",
      };
    }

    return {
      icon: CloudOff,
      kind: 'unknown',
      title: `Could not load ${resource}`,
      description:
        'Something went wrong reaching the catalog. Try again in a moment.',
    };
  }, [error, resource, notFoundCopy?.title, notFoundCopy?.description]);
};

// Convenience export so callers that just want a generic icon for an unknown
// error state don't reach into lucide directly.
export const ErrorIcon = AlertTriangle;

export default usePageError;
