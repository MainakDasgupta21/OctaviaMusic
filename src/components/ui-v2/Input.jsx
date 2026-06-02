import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Editorial input — hairline border on transparent ground.
 * Variants:
 *   - default  : hairline border, transparent surface
 *   - editorial: sharp corners, mono placeholder, italic on focus
 *   - filled   : opaque surface (legacy look, when on a colored hero)
 *
 * Sizes: sm | md | lg | xl
 */
const Input = forwardRef(
  (
    {
      className,
      leftIcon,
      rightIcon,
      error,
      size = 'md',
      variant = 'default',
      ...props
    },
    ref,
  ) => {
    const sizes = {
      sm: 'h-9 text-[12px]',
      md: 'h-10 text-[13px]',
      lg: 'h-12 text-[14px]',
      xl: 'h-14 text-[15px]',
    };

    const variants = {
      default:
        'rounded-sharp bg-transparent border border-white/[0.10] hover:border-white/20 focus:border-track/60 focus:bg-white/[0.025]',
      editorial:
        'rounded-sharp bg-transparent border border-white/[0.10] hover:border-white/20 focus:border-track/70 focus:bg-white/[0.03] placeholder:font-editorial placeholder:italic placeholder:text-ink-4',
      filled:
        'rounded-sharp bg-surface-2/60 border border-white/[0.10] focus:border-white/25',
    };

    const padLeftBySize = {
      sm: leftIcon ? 'pl-9' : 'pl-3',
      md: leftIcon ? 'pl-10' : 'pl-3.5',
      lg: leftIcon ? 'pl-11' : 'pl-4',
      xl: leftIcon ? 'pl-12' : 'pl-5',
    };
    const padRightBySize = {
      sm: rightIcon ? 'pr-9' : 'pr-3',
      md: rightIcon ? 'pr-10' : 'pr-3.5',
      lg: rightIcon ? 'pr-11' : 'pr-4',
      xl: rightIcon ? 'pr-12' : 'pr-5',
    };

    const iconLeftBySize = {
      sm: 'left-3',
      md: 'left-3.5',
      lg: 'left-4',
      xl: 'left-4',
    };
    const iconRightBySize = {
      sm: 'right-3',
      md: 'right-3.5',
      lg: 'right-4',
      xl: 'right-4',
    };

    return (
      <div className="relative w-full">
        {leftIcon ? (
          <span
            className={cn(
              'absolute top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none',
              iconLeftBySize[size],
            )}
          >
            {leftIcon}
          </span>
        ) : null}
        <input
          ref={ref}
          className={cn(
            'block w-full text-ink placeholder:text-ink-4',
            'transition-colors duration-short focus-ring',
            sizes[size],
            variants[variant],
            padLeftBySize[size],
            padRightBySize[size],
            error && '!border-danger/60 focus:!border-danger',
            className,
          )}
          aria-invalid={error || undefined}
          {...props}
        />
        {rightIcon ? (
          <span
            className={cn(
              'absolute top-1/2 -translate-y-1/2 text-ink-3',
              iconRightBySize[size],
            )}
          >
            {rightIcon}
          </span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';

export default Input;
