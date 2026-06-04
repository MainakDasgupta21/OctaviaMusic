import { useEffect, useMemo, useState } from 'react';
import { formatMasthead, getGreeting, getIssueNumber } from '@/lib/editorial-meta';

const readNow = () => new Date();

export const useEditorialMeta = ({ includeGreeting = false, tickMs = 60_000 } = {}) => {
  const [now, setNow] = useState(readNow);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(readNow());
    };

    const interval = window.setInterval(() => setNow(readNow()), tickMs);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [tickMs]);

  return useMemo(
    () => ({
      masthead: formatMasthead(now),
      issueNum: getIssueNumber(now),
      ...(includeGreeting ? { greeting: getGreeting(now.getHours()) } : {}),
    }),
    [includeGreeting, now],
  );
};

export default useEditorialMeta;
