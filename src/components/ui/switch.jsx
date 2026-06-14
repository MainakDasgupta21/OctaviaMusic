import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

/**
 * Editorial switch:
 * - Off: quiet filled track with a hairline border (reads as a real control,
 *   not an empty outline).
 * - On : solid track-accent with an inset highlight + soft accent glow.
 * - Thumb glides on a single easing curve with symmetric 3px insets and a
 *   subtle press-squash for a tactile, premium feel.
 */
const Switch = React.forwardRef(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "group peer relative inline-flex h-[26px] min-h-[26px] max-h-[26px] w-[46px] shrink-0 cursor-pointer items-center rounded-full",
      "transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
      "border border-white/[0.12]",
      "data-[state=unchecked]:bg-white/[0.06] data-[state=unchecked]:hover:bg-white/[0.10]",
      "data-[state=checked]:border-transparent data-[state=checked]:bg-track",
      "data-[state=checked]:shadow-[inset_0_1px_0_hsl(0_0%_100%/0.28),0_2px_10px_-2px_hsl(var(--track-accent)/0.55)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-bone",
        "ring-1 ring-black/10 shadow-[0_1px_3px_hsl(0_0%_0%/0.4)]",
        "translate-x-[3px] data-[state=checked]:translate-x-[23px]",
        "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "group-active:scale-95",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
