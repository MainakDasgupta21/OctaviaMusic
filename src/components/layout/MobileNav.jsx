import { Home, Search, TrendingUp, Play, Library } from 'lucide-react';
import { motion } from 'framer-motion';
import { NavLink } from '@/components/NavLink';
import { usePrefetchProps } from '@/hooks/use-route-prefetch';
import { cn } from '@/lib/utils';

// Five-tab bottom nav. Library was previously drawer-only on mobile, which
// hid a primary destination behind a hamburger. Promote it to a first-class
// tab so playlist + favourites are reachable in one tap.
const items = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: TrendingUp, label: 'Trending', path: '/trending' },
  { icon: Play, label: 'Player', path: '/player' },
  { icon: Library, label: 'Library', path: '/library' },
];

const MobileNavItem = ({ item }) => {
  const prefetch = usePrefetchProps(item.path);
  const Icon = item.icon;

  return (
    <li key={item.path} className="flex">
      <NavLink
        to={item.path}
        end={item.path === '/'}
        {...prefetch}
        className={({ isActive }) =>
          cn(
            'touch-target flex-1 flex flex-col items-center justify-center gap-1 rounded-sharp transition-colors focus-ring relative',
            isActive ? 'text-accent' : 'text-ink-3 hover:text-ink',
          )
        }
      >
        {({ isActive }) => (
          <>
            {/* Hairline indicator above icon */}
            <span
              aria-hidden="true"
              className={cn(
                'absolute top-1 left-1/2 -translate-x-1/2 h-px w-6 transition-all',
                isActive ? 'bg-track' : 'bg-transparent',
              )}
            />
            <Icon
              className={cn('w-5 h-5 transition-transform', isActive && 'scale-105')}
              strokeWidth={isActive ? 2 : 1.75}
            />
            <span
              className={cn(
                'hidden xs:inline text-[10px] font-medium tracking-wide',
                isActive && 'font-semibold',
              )}
            >
              {item.label}
            </span>
          </>
        )}
      </NavLink>
    </li>
  );
};

const MobileNav = () => {
  return (
    <motion.nav
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.1 }}
      className={cn(
        'mobile-nav-shell lg:hidden fixed inset-x-2 bottom-[var(--mobile-nav-offset)] z-40 h-[var(--mobile-nav-height)] rounded-soft',
        'bg-surface-1/85 backdrop-blur-xl border border-white/[0.08] shadow-elev-4',
        'px-2',
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-5 h-full items-stretch">
        {items.map((item) => (
          <MobileNavItem key={item.path} item={item} />
        ))}
      </ul>
    </motion.nav>
  );
};

export default MobileNav;
