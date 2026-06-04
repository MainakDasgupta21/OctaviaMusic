// =============================================================================
// `useRankedSearch` — a drop-in replacement for the inline
// `rankAndMerge(...)` call in SearchPage that offloads ranking to a Web
// Worker when the candidate set is large enough to cost frames on the main
// thread. Falls back to the sync ranker when:
//   - The Worker API is unavailable (SSR / jsdom tests)
//   - The candidate count is below `WORKER_THRESHOLD`
//   - The worker hasn't responded yet (first-paint pre-warm)
//
// The hook is intentionally narrow: it only wraps `rankAndMerge` and never
// fetches anything. Cancellation is implicit — newer requests overwrite the
// state once the worker resolves them; older responses are discarded by id.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { rankAndMerge } from '@/lib/search-rank';

const WORKER_THRESHOLD = 50;

const candidateCountOf = (params = {}) =>
  (params.serverResults?.length || 0) +
  (params.favorites?.length || 0) +
  (params.history?.length || 0) +
  (params.playlists?.length || 0);

// Stringify a Map/Set-friendly snapshot of the params so React's useEffect
// can do a shallow comparison without recreating the worker payload on
// every render. We don't include the Maps/Sets in the cache key — they're
// derived from `history`/`favorites` and rarely change in isolation.
const fingerprint = (params = {}) => {
  const q = params.query;
  const queryKey = typeof q === 'string' ? q : q?.raw || '';
  return JSON.stringify({
    q: queryKey,
    s: params.serverResults?.length || 0,
    f: params.favorites?.length || 0,
    h: params.history?.length || 0,
    p: params.playlists?.length || 0,
    artist: params.currentArtist || '',
    sort: params.sortHint || null,
    limit: params.limit || null,
  });
};

const createWorker = () => {
  if (typeof Worker === 'undefined') return null;
  try {
    // Vite resolves `new URL('./x.worker.js', import.meta.url)` to a hashed
    // worker bundle at build time. The `{ type: 'module' }` flag emits an
    // ESM worker so the in-worker `import { rankAndMerge }` resolves.
    return new Worker(new URL('@/lib/search-rank.worker.js', import.meta.url), {
      type: 'module',
    });
  } catch {
    return null;
  }
};

export const useRankedSearch = (params, { workerEnabled = true } = {}) => {
  const candidateCount = candidateCountOf(params);
  const useWorker = workerEnabled && candidateCount >= WORKER_THRESHOLD;

  // Sync result is always computed — it's the fallback when the worker is
  // unavailable or hasn't responded yet, AND it's the source of truth for
  // small payloads. Memoized on the param fingerprint so the user types
  // without thrashing the ranker.
  const fp = fingerprint(params);
  // `params` is captured by reference inside useMemo, but we deliberately
  // memo on the fingerprint string so the ranker reruns only when relevant
  // payload fields actually change. (params identity changes every render.)
  const paramsRef = useRef(params);
  paramsRef.current = params;
  const syncResult = useMemo(() => rankAndMerge(paramsRef.current), [fp]);

  const [workerResult, setWorkerResult] = useState(null);
  const [workerFp, setWorkerFp] = useState(null);
  const workerRef = useRef(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!useWorker) {
      // Tear down the worker if we no longer need it (small payload).
      if (workerRef.current) {
        try {
          workerRef.current.terminate();
        } catch {
          /* noop */
        }
        workerRef.current = null;
      }
      setWorkerResult(null);
      setWorkerFp(null);
      return undefined;
    }

    if (!workerRef.current) {
      workerRef.current = createWorker();
    }
    const worker = workerRef.current;
    if (!worker) {
      return undefined;
    }

    const myId = ++reqIdRef.current;
    const handle = (event) => {
      if (event?.data?.id !== myId) return;
      if (event.data.ok) {
        setWorkerResult(event.data.result);
        setWorkerFp(fp);
      }
    };
    worker.addEventListener('message', handle);
    try {
      worker.postMessage({ id: myId, payload: params });
    } catch {
      // Some payload field isn't structured-cloneable. Fall back to sync;
      // the consumer never sees a failure.
    }

    return () => {
      worker.removeEventListener('message', handle);
    };
  }, [fp, useWorker]);

  useEffect(
    () => () => {
      if (workerRef.current) {
        try {
          workerRef.current.terminate();
        } catch {
          /* noop */
        }
        workerRef.current = null;
      }
    },
    [],
  );

  if (useWorker && workerResult && workerFp === fp) return workerResult;
  return syncResult;
};

export const __testing = { fingerprint, candidateCountOf, WORKER_THRESHOLD };

export default useRankedSearch;
