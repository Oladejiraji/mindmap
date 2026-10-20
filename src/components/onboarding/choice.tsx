import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function Choice({
  selected,
  onSelect,
  role,
  align = "center",
  hint,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  role: "radio" | "checkbox";
  align?: "center" | "start";
  hint?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "corner-squircle relative flex min-h-10 cursor-pointer flex-col rounded-xl px-3.5 py-2.5 text-body-sm outline-none transition-[background-color,box-shadow,color] duration-150 focus-visible:ring-3 focus-visible:ring-ring/50",
        align === "center" ? "items-center justify-center text-center" : "items-start text-left",
        selected
          ? "bg-surface-container text-fg-primary shadow-[0_0_0_1.5px_var(--brand-solid)]"
          : "bg-surface-container/60 text-fg-secondary shadow-border hover:bg-surface-container hover:text-fg-primary",
      )}
    >
      <span className="font-medium">{children}</span>
      {hint && <span className="mt-0.5 text-caption-lg text-fg-tertiary">{hint}</span>}
      {selected && align === "start" && (
        <span className="absolute top-2.5 right-2.5 flex size-4 items-center justify-center rounded-full bg-brand-solid text-on-brand-solid">
          <Check className="size-2.5" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
