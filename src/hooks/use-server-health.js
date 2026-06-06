import { useQuery } from '@tanstack/react-query';
import { getServerHealth } from '@/lib/api';

// =============================================================================
// useServerHealth — polls `/health` on a 60s interval. The TopBar reads the
// `isOffline` flag to surface an offline banner so users know failures aren't
// their network. We keep the polling silent (no retries, no react-query
// error boundaries) so a backend hiccup just turns the banner on; the next
// successful poll turns it off automatically.
// =============================================================================

const POLL_INTERVAL_MS = 60_000;

export const useServerHealth = () => {
  const query = useQuery({
    queryKey: ['server-health'],
    queryFn: getServerHealth,
    // Keep tab-switching cheap — the heartbeat is enough.
    refetchOnWindowFocus: false,
    refetchInterval: POLL_INTERVAL_MS,
    refetchIntervalInBackground: false,
    // The probe is best-effort; don't burn cycles retrying.
    retry: 0,
    // Stale immediately so a fresh navigation back to the app re-checks.
    staleTime: 0,
    gcTime: 5 * 60_000,
  });

  const isOffline = Boolean(query.isError);
  const status = query.data?.status || (query.isError ? 'offline' : 'ok');

  return {
    isOffline,
    status,
    isChecking: query.isFetching,
    lastCheckedAt: query.dataUpdatedAt || null,
    refetch: query.refetch,
  };
};

export default useServerHealth;
