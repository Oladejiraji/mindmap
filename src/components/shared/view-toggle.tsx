"use client";

import Link from "next/link";
import { MessageSquare, Network } from "lucide-react";
import { cn } from "@/lib/utils";

/*
 * Canvas ↔ Chat switch (design-system segmented control). Each side is a
 * link so it works with the keyboard, middle-click and history; `onChat`
 * lets the node page switch tabs in place instead of navigating.
 */
export function ViewToggle({
  active,
  canvasHref,
  chatHref,
  chatLabel,
  onChat,
  className,
}: {
  active: "canvas" | "chat";
  canvasHref: string;
  chatHref: string;
  /** Shown as the Chat segment's tooltip, e.g. the target node's title. */
  chatLabel?: string;
  onChat?: () => void;
  className?: string;
}) {
  const item = (on: boolean) =>
    cn(
      "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-body-sm font-medium outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-3.5",
      on ? "bg-surface-container text-fg-primary shadow-default" : "text-fg-secondary hover:text-fg-primary",
    );
  return (
    <div role="group" aria-label="View" className={cn("flex h-8 items-center gap-0.5 rounded-lg bg-component p-0.5", className)}>
      <Link href={canvasHref} aria-current={active === "canvas" ? "page" : undefined} className={item(active === "canvas")}>
        <Network />
        Canvas
      </Link>
      <Link
        href={chatHref}
        aria-current={active === "chat" ? "page" : undefined}
        title={chatLabel ? `Chat · ${chatLabel}` : "Chat"}
        onClick={(e) => {
          if (onChat) {
            e.preventDefault();
            onChat();
          }
        }}
        className={item(active === "chat")}
      >
        <MessageSquare />
        Chat
      </Link>
    </div>
  );
}
