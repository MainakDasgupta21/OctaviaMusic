import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

const button = cva(
  [
    'inline-flex items-center justify-center gap-2 select-none whitespace-nowrap',
    // Pick up the new premium focus-ring language for every variant.
    'font-medium rounded-full focus-premium',
    'transition-[transform,background,box-shadow,opacity,border-color]',
    'duration-short ease-emphasis',
    // Standardised disabled state — visible but unmistakably inert.
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:active:scale-100',
    'active:scale-[0.985]',
  ],
  {
    variants: {
      variant: {
        // Refined solid — radial highlight + subtle ring give it premium gloss
        // without the "juicy" gradient flatness.
        solid: [
          'text-track-fg shadow-accent ring-1 ring-white/15',
          'bg-[radial-gradient(circle_at_30%_25%,hsl(var(--ink-primary)/0.22),transparent_55%),linear-gradient(135deg,hsl(var(--track-accent)),hsl(var(--track-accent-strong)))]',
          'hover:brightness-[1.06] hover:ring-white/25',
        ],
        // PREMIUM — the canonical hero CTA. Solid base + rim-light +
        // an inner radial glow that "lifts" the surface. Used for the
        // primary call-to-action on hero pages.
        premium: [
          'text-track-fg ring-1 ring-white/20',
          'bg-[radial-gradient(120%_80%_at_30%_15%,hsl(var(--ink-primary)/0.28),transparent_55%),linear-gradient(135deg,hsl(var(--track-accent)),hsl(var(--track-accent-strong)))]',
          // Rim-light + accent shadow + inner glow stack. The inset 1px
          // white is the "premium" tell — every world-class CTA has one.
          'shadow-[inset_0_1px_0_hsl(var(--ink-primary)/0.32),0_10px_28px_-6px_hsl(var(--track-accent)/0.55),0_0_0_1px_hsl(var(--ink-primary)/0.10)]',
          'hover:brightness-[1.08] hover:ring-white/30',
          'hover:shadow-[inset_0_1px_0_hsl(var(--ink-primary)/0.38),0_14px_36px_-6px_hsl(var(--track-accent)/0.70),0_0_0_1px_hsl(var(--ink-primary)/0.14)]',
        ],
        ghost: [
          'bg-transparent text-ink hover:bg-white/[0.04]',
        ],
        glass: [
          'bg-white/[0.04] backdrop-blur-md border border-white/[0.10] text-ink',
          'hover:bg-white/[0.08] hover:border-white/[0.18]',
        ],
        outline: [
          'bg-transparent border border-white/15 text-ink hover:bg-white/[0.04] hover:border-white/25',
        ],
        gradient: [
          'bg-gradient-to-r from-brand-500 to-brand-400 text-track-fg shadow-elev-3 ring-1 ring-white/15',
          'hover:from-brand-400 hover:to-brand-300',
        ],
        link: [
          'bg-transparent text-accent hover:underline underline-offset-4 px-0 h-auto rounded-none',
        ],
        danger: [
          'bg-danger/15 text-danger hover:bg-danger/25 border border-danger/30',
        ],
        // EDITORIAL — sharp corners, mono uppercase, hairline border.
        // For "Learn more", "Read", "Continue" — the cool counterpart to solid.
        editorial: [
          '!rounded-sharp bg-transparent border border-white/15 text-ink',
          'font-mono uppercase tracking-[0.15em] !text-[11px] !font-medium',
          'hover:bg-ink/5 hover:border-white/30',
        ],
      },
      size: {
        sm: 'h-8 px-3.5 text-[12px]',
        md: 'h-10 px-4 text-[13px]',
        lg: 'h-12 px-6 text-[14px]',
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0',
        'icon-lg': 'h-12 w-12 p-0',
      },
    },
    defaultVariants: { variant: 'solid', size: 'md' },
  },
);

const Button = forwardRef(
  (
    {
      className,
      variant,
      size,
      loading = false,
      disabled,
      asChild = false,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref,
  ) => {
    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(button({ variant, size }), className)}
          aria-busy={loading || undefined}
          aria-disabled={disabled || loading || undefined}
          data-disabled={disabled || loading ? '' : undefined}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    const Comp = 'button';
    return (
      <Comp
        ref={ref}
        className={cn(button({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : leftIcon ? (
          <span className="inline-flex items-center" aria-hidden="true">
            {leftIcon}
          </span>
        ) : null}
        {children}
        {!loading && rightIcon ? (
          <span className="inline-flex items-center" aria-hidden="true">
            {rightIcon}
          </span>
        ) : null}
      </Comp>
    );
  },
);

Button.displayName = 'Button';

export { Button, button };
export default Button;
