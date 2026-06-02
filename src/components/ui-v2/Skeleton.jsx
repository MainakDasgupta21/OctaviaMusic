import { cn } from '@/lib/utils';

const Skeleton = ({ className, ...props }) => (
  <span
    className={cn('block skeleton rounded-md', className)}
    aria-hidden="true"
    {...props}
  />
);

export default Skeleton;
