import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const surface = cva('', {
  variants: {
    variant: {
      glass: 'rounded-2xl glass',
      'glass-strong': 'rounded-2xl glass-strong',
      solid: 'rounded-2xl bg-surface-2 border border-white/[0.06]',
      raised: 'rounded-2xl bg-surface-3 border border-white/[0.06] shadow-elev-3',
      // Editorial: sharp top, hairline border. Reads like a magazine slab.
      editorial: 'rounded-sharp bg-surface-2/60 backdrop-blur-md border border-white/[0.07]',
      // Plain panel with no chrome.
      bare: '',
    },
    padded: {
      none: '',
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-8',
    },
  },
  defaultVariants: { variant: 'glass', padded: 'md' },
});

const Surface = forwardRef(
  ({ as: Tag = 'div', variant, padded, className, ...props }, ref) => (
    <Tag ref={ref} className={cn(surface({ variant, padded }), className)} {...props} />
  ),
);

Surface.displayName = 'Surface';

export default Surface;
