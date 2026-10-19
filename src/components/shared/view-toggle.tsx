"use client";

import Link from "next/link";
import { CanvasViewIcon } from "@/components/icons/canvas-view-icon";
import { ChatIcon } from "@/components/icons/chat-icon";
import { cn } from "@/lib/utils";

/*
 * Canvas ↔ Chat switch (design-system segmented control). Both views live
 * in the same tab: `onSelect` swaps them in place. Each side is still a
 * link (same path, different ?view=) so it works with middle-click.
 */
export function ViewToggle({
  active,
  canvasHref,
  chatHref,
  chatLabel,
  onSelect,
  className,
}: {
  active: "canvas" | "chat";
  canvasHref: string;
  chatHref: string;
  /** Shown as the Chat segment's tooltip, e.g. the target node's title. */
  chatLabel?: string;
  onSelect?: (view: "canvas" | "chat") => void;
  className?: string;
}) {
  const item = (on: boolean) =>
    cn(
      "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-body-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-3.5",
      on ? "bg-surface-container text-fg-primary shadow-default" : "text-fg-secondary hover:text-fg-primary",
    );
  return (
    <div role="group" aria-label="View" className={cn("flex h-8 items-center gap-0.5 rounded-lg bg-component p-0.5", className)}>
      <Link
        href={canvasHref}
        aria-current={active === "canvas" ? "page" : undefined}
        onClick={(e) => {
          if (onSelect) {
            e.preventDefault();
            onSelect("canvas");
          }
        }}
        className={item(active === "canvas")}
      >
        <CanvasViewIcon />
        Canvas
      </Link>
      <Link
        href={chatHref}
        aria-current={active === "chat" ? "page" : undefined}
        title={chatLabel ? `Chat · ${chatLabel}` : "Chat"}
        onClick={(e) => {
          if (onSelect) {
            e.preventDefault();
            onSelect("chat");
          }
        }}
        className={item(active === "chat")}
      >
        <ChatIcon />
        Chat
      </Link>
    </div>
  );
}
