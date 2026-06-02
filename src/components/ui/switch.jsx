import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

/**
 * Editorial switch:
 * - Off: transparent body with a hairline border.
 * - On : solid track-accent with an inset highlight (paper-meets-ink).
 * - Thumb has a small ring + soft shadow for physical feel.
 */
const Switch = React.forwardRef(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-all",
      "border border-white/[0.14] data-[state=checked]:border-transparent",
      "data-[state=unchecked]:bg-transparent",
      "data-[state=checked]:bg-track data-[state=checked]:shadow-[inset_0_1px_0_hsl(0_0%_100%/0.22),0_0_0_2px_hsl(var(--track-accent)/0.18)]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-[18px] w-[18px] translate-x-0.5 rounded-full",
        "bg-bone ring-1 ring-black/15 shadow-[0_1px_2px_hsl(0_0%_0%/0.35)]",
        "transition-transform data-[state=checked]:translate-x-[22px]",
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
