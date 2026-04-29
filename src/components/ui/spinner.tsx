import { cn } from "@/lib/utils";

function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-4 shrink-0 rounded-full border-2 border-current",
        "[animation:spinner-clip_0.8s_infinite_linear_alternate,spinner-flip_1.6s_infinite_linear]",
        className,
      )}
    />
  );
}

export { Spinner };
