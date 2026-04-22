"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Network } from "lucide-react";
import type { Id } from "@convex/dataModel";
import { routes } from "@/lib/routes";

export function CanvasToggle() {
  const pathname = usePathname();
  const match = pathname.match(/^\/t\/([^/]+)\/n\/[^/]+/);
  if (!match) return null;

  const threadId = match[1] as Id<"threads">;

  return (
    <Link
      href={routes.thread(threadId)}
      aria-label="Canvas view"
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Network className="size-4" />
    </Link>
  );
}
