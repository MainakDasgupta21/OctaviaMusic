import { cn } from '@/lib/utils';

// `variant="iris"` swaps the warm editorial shimmer for the Gen Z iridescent
// tint. Reserve it for hero loaders (HeroSkeleton, big covers) — using it in
// dense lists makes the page look like a disco floor.
const Skeleton = ({ className, variant = 'default', ...props }) => (
  <span
    className={cn(
      'block rounded-md',
      variant === 'iris' ? 'skeleton-pulse-iris' : 'skeleton',
      className,
    )}
    aria-hidden="true"
    {...props}
  />
);

export default Skeleton;
