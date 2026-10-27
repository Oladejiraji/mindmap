import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="corner-squircle flex rounded-lg bg-component p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-6 cursor-pointer rounded-md px-2.5 text-caption-lg font-medium whitespace-nowrap capitalize outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
            value === o.value
              ? "bg-surface-container text-fg-primary shadow-border"
              : "text-fg-tertiary hover:text-fg-secondary",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
