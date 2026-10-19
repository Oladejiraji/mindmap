"use client";

import Link from "next/link";
import { CanvasViewIcon } from "@/components/icons/canvas-view-icon";
import { ChatIcon } from "@/components/icons/chat-icon";
import { cn } from "@/lib/utils";

/*
 * Canvas ↔ Chat switch (design-system segmented control). Both views live
 * in the same tab: `onSelect` swaps them in place. Each side is still a
 * link (same path, different ?view=) so it works with middle-click.
 * Icons only; the names are in the tooltip and accessible label.
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
      "flex size-7 items-center justify-center rounded-md outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-4",
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
        aria-label="Canvas"
        title="Canvas"
        className={item(active === "canvas")}
      >
        <CanvasViewIcon />
      </Link>
      <Link
        href={chatHref}
        aria-current={active === "chat" ? "page" : undefined}
        aria-label="Chat"
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
      </Link>
    </div>
  );
}
