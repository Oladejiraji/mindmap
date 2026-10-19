"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

/* Switch, after design.interfere.com/switch: 28×16 track, translucent
 * component fill when off, brand when on; the thumb slides 12px. */
export function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full bg-component-active outline-none transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:bg-brand-solid data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-3 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-150 data-checked:translate-x-3.5" />
    </SwitchPrimitive.Root>
  );
}
