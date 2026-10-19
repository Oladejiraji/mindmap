import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Divider — follows design.interfere.com/divider.
 * Thickness A–E (0.5 / 1 / 1.2 / 1.5 / 2px, default B), colour from the
 * border tokens (default / subtle / strong), horizontal or vertical, and
 * padding (none / xs 2 / sm 4 / md 6 / lg 8px) on both sides of the line.
 * Renders a wrapper (padding) around role="separator" (the line).
 */
export const DIVIDER_SIZES = { a: "0.5px", b: "1px", c: "1.2px", d: "1.5px", e: "2px" } as const;

const divider = cva("flex", {
  variants: {
    orientation: {
      horizontal: "w-full [&>[role=separator]]:h-(--divider-size) [&>[role=separator]]:w-full",
      vertical: "self-stretch [&>[role=separator]]:h-full [&>[role=separator]]:w-(--divider-size)",
    },
    color: {
      default: "[&>[role=separator]]:bg-border-default",
      subtle: "[&>[role=separator]]:bg-border-subtle",
      strong: "[&>[role=separator]]:bg-border-strong",
    },
    padding: { none: "", xs: "", sm: "", md: "", lg: "" },
  },
  compoundVariants: [
    { orientation: "horizontal", padding: "xs", className: "py-0.5" },
    { orientation: "horizontal", padding: "sm", className: "py-1" },
    { orientation: "horizontal", padding: "md", className: "py-1.5" },
    { orientation: "horizontal", padding: "lg", className: "py-2" },
    { orientation: "vertical", padding: "xs", className: "px-0.5" },
    { orientation: "vertical", padding: "sm", className: "px-1" },
    { orientation: "vertical", padding: "md", className: "px-1.5" },
    { orientation: "vertical", padding: "lg", className: "px-2" },
  ],
  defaultVariants: { orientation: "horizontal", color: "default", padding: "none" },
});

export function Divider({
  size = "b",
  orientation = "horizontal",
  color,
  padding,
  className,
}: VariantProps<typeof divider> & { size?: keyof typeof DIVIDER_SIZES; className?: string }) {
  return (
    <div
      className={cn(divider({ orientation, color, padding }), className)}
      style={{ ["--divider-size" as string]: DIVIDER_SIZES[size] }}
    >
      <div role="separator" aria-orientation={orientation ?? "horizontal"} />
    </div>
  );
}
