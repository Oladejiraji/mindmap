import { cn } from "@/lib/utils";

export function Chips<T extends string>({
  label,
  options,
  isOn,
  onToggle,
  role,
}: {
  label: string;
  options: { value: T; label: string }[];
  isOn: (v: T) => boolean;
  onToggle: (v: T) => void;
  role: "radio" | "checkbox";
}) {
  return (
    <div
      role={role === "radio" ? "radiogroup" : "group"}
      aria-label={label}
      className="flex flex-wrap gap-2 px-4 py-4"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role={role}
          aria-checked={isOn(o.value)}
          onClick={() => onToggle(o.value)}
          className={cn(
            "corner-squircle h-7 cursor-pointer rounded-full px-3 text-caption-lg font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
            isOn(o.value)
              ? "bg-brand-subtle text-brand-fg"
              : "bg-component text-fg-secondary hover:text-fg-primary",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
