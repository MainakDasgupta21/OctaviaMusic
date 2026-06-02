import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

/**
 * Editorial slider:
 * - Hairline by default, can be upgraded per-context via CSS hooks.
 * - Thumb hidden until hover/focus on the root (group).
 * - Range fills with the track-accent gradient (ember → bone).
 */
const Slider = React.forwardRef(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "slider-root group relative flex w-full touch-none select-none items-center",
      className,
    )}
    {...props}
  >
    <SliderPrimitive.Track
      className="slider-track relative h-[4px] w-full grow overflow-hidden rounded-full bg-white/[0.10]"
    >
      <SliderPrimitive.Range
        className="slider-range absolute h-full rounded-full"
        style={{
          backgroundImage:
            'linear-gradient(90deg, hsl(var(--track-accent)), hsl(var(--track-accent-strong)))',
        }}
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        "slider-thumb block h-3.5 w-3.5 rounded-full bg-bone ring-1 ring-white/20",
        "shadow-[0_0_0_4px_hsl(var(--track-accent)/0.18)]",
        "opacity-0 scale-90 transition-all duration-150",
        "group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
