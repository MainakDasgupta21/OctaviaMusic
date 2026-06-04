// Off-main-thread ranker. The SearchPage opts in via `useRankedSearch` when
// the candidate set is large enough that running rankAndMerge in the main
// thread starts dropping animation frames. The contract is intentionally
// dumb: receive a payload, run the ranker, post the result back keyed by an
// id so the caller can match responses to requests.
import { rankAndMerge } from './search-rank';

self.addEventListener('message', (event) => {
  const data = event?.data || {};
  const { id, payload } = data;
  if (id == null) return;
  try {
    const result = rankAndMerge(payload);
    self.postMessage({ id, ok: true, result });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: String(error?.message || error || 'rankAndMerge failed'),
    });
  }
});
