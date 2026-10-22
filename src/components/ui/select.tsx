"use client";

import type { ReactNode } from "react";
import { Select as BaseSelect } from "@base-ui/react/select";
import { CheckIcon } from "@/components/icons/check-icon";
import { SelectorIcon } from "@/components/icons/selector-icon";
import { popupRow, popupSection, popupSurface } from "@/components/shared/sidebar/popover-styles";
import { cn } from "@/lib/utils";

/*
 * Dropdown select: a field-styled trigger showing the short label, and a
 * popup underneath it in the same family as the sidebar menus (modal
 * surface, 32px rows), at least as wide as the field. Options can carry an
 * icon on a small 16px tile, shown in the list and the field; the chosen
 * row has a check on the right. Options can also carry a longer
 * `itemLabel` for the list (e.g. "1–10" in the field, "1–10 employees" in
 * the list). Highlighting a row is instant: it's the most frequent
 * interaction here.
 */

export type SelectOption<T extends string> = { value: T; label: string; itemLabel?: string; icon?: ReactNode };

/* An option's icon on a small tile, in the list and in the field. */
function IconTile({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-4 shrink-0 items-center justify-center rounded-sm bg-surface-container text-fg-secondary [&_svg]:size-2.5">
      {children}
    </span>
  );
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select",
  className,
  "aria-label": ariaLabel,
}: {
  value: T | null;
  onChange: (value: T | null) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <BaseSelect.Root value={value} onValueChange={(v) => onChange(v as T | null)}>
      <BaseSelect.Trigger
        aria-label={ariaLabel}
        className={cn(
          "group corner-squircle flex h-10 w-full cursor-pointer items-center gap-2 rounded-xl bg-surface-container px-3.5 text-left text-body-sm text-fg-primary shadow-border outline-none transition-[box-shadow,background-color] duration-150 ease-out hover:bg-[#f5f5f5] data-popup-open:bg-[#f5f5f5] focus-visible:ring-3 focus-visible:ring-ring/30 data-popup-open:ring-3 data-popup-open:ring-ring/30 motion-reduce:transition-none",
          className,
        )}
      >
        <BaseSelect.Value
          className="min-w-0 flex-1 truncate data-placeholder:text-fg-tertiary"
          placeholder={placeholder}
        >
          {(v: T | null) => {
            const o = options.find((x) => x.value === v);
            if (!o) return placeholder;
            return (
              <span className="flex min-w-0 items-center gap-2">
                {o.icon && <IconTile>{o.icon}</IconTile>}
                <span className="truncate">{o.label}</span>
              </span>
            );
          }}
        </BaseSelect.Value>
        <SelectorIcon className="size-4 shrink-0 text-fg-tertiary" />
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner sideOffset={6} alignItemWithTrigger={false} className="z-50">
          <BaseSelect.Popup className={cn(popupSurface, "w-max min-w-(--anchor-width)")}>
            <BaseSelect.List className={cn(popupSection, "max-h-(--available-height) overflow-y-auto")}>
              {options.map((o) => (
                <BaseSelect.Item key={o.value} value={o.value} className={cn(popupRow, "gap-2.5 pr-2.5 font-medium")}>
                  {o.icon && <IconTile>{o.icon}</IconTile>}
                  <BaseSelect.ItemText className="min-w-0 flex-1 truncate">{o.itemLabel ?? o.label}</BaseSelect.ItemText>
                  <BaseSelect.ItemIndicator className="ml-4 flex shrink-0">
                    <CheckIcon className="size-4 text-fg-secondary" aria-hidden />
                  </BaseSelect.ItemIndicator>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
