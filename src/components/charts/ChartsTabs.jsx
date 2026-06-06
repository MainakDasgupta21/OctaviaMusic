import { NavLink } from 'react-router-dom';
import { usePrefetchProps } from '@/hooks/use-route-prefetch';
import { cn } from '@/lib/utils';

// Songs/Artists tab pair that lives on both /charts and /charts/artists. URL
// is the source of truth for active state (NavLink's isActive); the `end`
// flag on the Songs link keeps it from staying active when the user is
// on /charts/artists.
const TAB_CLASS = (isActive) =>
  cn(
    'px-3.5 py-1.5 rounded-full text-[12px] font-mono uppercase tracking-[0.18em] border transition-colors focus-ring',
    isActive
      ? 'bg-white/[0.06] border-white/[0.18] text-ink'
      : 'border-white/[0.06] text-ink-3 hover:text-ink hover:border-white/[0.12]',
  );

const ChartsTabs = ({ className }) => {
  const songsPrefetch = usePrefetchProps('/charts');
  const artistsPrefetch = usePrefetchProps('/charts/artists');
  return (
    <nav
      aria-label="Charts sections"
      className={cn('flex items-center gap-2', className)}
    >
      <NavLink to="/charts" end {...songsPrefetch} className={({ isActive }) => TAB_CLASS(isActive)}>
        Songs
      </NavLink>
      <NavLink to="/charts/artists" {...artistsPrefetch} className={({ isActive }) => TAB_CLASS(isActive)}>
        Artists
      </NavLink>
    </nav>
  );
};

export default ChartsTabs;
