import { cn } from "@/lib/utils";

/* The account's avatar: a brand-blue gradient circle, used wherever the
 * signed-in user is shown (sidebar account, profile menu, collaborators,
 * Get started). */
export function UserAvatar({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("block shrink-0 rounded-full", className)}
      style={{ width: size, height: size, background: "linear-gradient(135deg, oklch(0.78 0.12 245), var(--brand-solid) 70%)" }}
    />
  );
}
