"use client";

import { Select as BaseSelect } from "@base-ui/react/select";
import { CheckIcon } from "@/components/icons/check-icon";
import { ChevronDownIcon } from "@/components/icons/chevron-down";
import { popupRow, popupSection, popupSurface } from "@/components/shared/sidebar/popover-styles";
import { cn } from "@/lib/utils";

/*
 * Dropdown select: a field-styled trigger showing the short label, and a
 * popup the trigger's width underneath it, in the same family as the
 * sidebar menus (modal surface, 14px rows). The chosen row has a check in
 * a left gutter; the chevron flips while open. Options can carry a longer
 * `itemLabel` for the list (e.g. "1–10" in the field, "1–10 employees" in
 * the list). Highlighting a row is instant: it's the most frequent
 * interaction here.
 */

export type SelectOption<T extends string> = { value: T; label: string; itemLabel?: string };

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
          "group corner-squircle flex h-10 w-full cursor-pointer items-center gap-2 rounded-xl bg-surface-container px-3.5 text-left text-body-sm text-fg-primary shadow-border outline-none transition-shadow focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:ring-3 data-popup-open:ring-ring/50",
          className,
        )}
      >
        <BaseSelect.Value
          className="min-w-0 flex-1 truncate data-placeholder:text-fg-tertiary"
          placeholder={placeholder}
        >
          {(v: T | null) => options.find((o) => o.value === v)?.label ?? placeholder}
        </BaseSelect.Value>
        <ChevronDownIcon className="size-4 shrink-0 text-fg-tertiary transition-[rotate] duration-150 ease-out group-data-popup-open:rotate-180 motion-reduce:transition-none" />
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner sideOffset={6} alignItemWithTrigger={false} className="z-50">
          <BaseSelect.Popup className={cn(popupSurface, "w-(--anchor-width) min-w-40")}>
            <BaseSelect.List className={cn(popupSection, "max-h-(--available-height) overflow-y-auto")}>
              {options.map((o) => (
                <BaseSelect.Item key={o.value} value={o.value} className={cn(popupRow, "h-9 gap-2 pl-2 font-medium")}>
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    <BaseSelect.ItemIndicator>
                      <CheckIcon className="size-4 text-fg-secondary" aria-hidden />
                    </BaseSelect.ItemIndicator>
                  </span>
                  <BaseSelect.ItemText>{o.itemLabel ?? o.label}</BaseSelect.ItemText>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
