"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * How every chat scrolls: the conversation scrolls above a fixed footer
 * (the composer). When a new message arrives (`latestKey` changes), it
 * moves to the top of the view and the reply streams in below it, so a
 * long reply can be read from the start. Once you've scrolled up, a
 * button jumps back to the end.
 *
 * Messages are found by their data-message attribute (MessageItem sets it).
 */
export function ChatScroller({
  latestKey,
  streaming,
  footer,
  children,
}: {
  /** Changes when there's a new message to bring into view (or another conversation). */
  latestKey: string;
  /** A reply is being written: room is kept below it, so the newest message can sit at the top. */
  streaming: boolean;
  /** Under the conversation: usually the composer. */
  footer: ReactNode;
  children: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [awayFromBottom, setAwayFromBottom] = useState(false);
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) setAwayFromBottom(el.scrollHeight - el.scrollTop - el.clientHeight > 160);
  };
  const scrollToBottom = () =>
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });

  // The newest message to the top. Scrolling the DOM is an external
  // system, so an effect is the right tool.
  useEffect(() => {
    const messages = scrollRef.current?.querySelectorAll("[data-message]");
    messages?.[messages.length - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [latestKey]);

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className={cn("flex min-h-full flex-col", streaming && "pb-[60vh]")}>{children}</div>
      </div>
      <div className="relative shrink-0">
        {/* Jump to the end, shown once you've scrolled up */}
        <button
          type="button"
          onClick={scrollToBottom}
          aria-label="Scroll to latest"
          tabIndex={awayFromBottom ? 0 : -1}
          className={cn(
            "absolute -top-12 left-1/2 z-10 flex size-9 -translate-x-1/2 cursor-pointer items-center justify-center rounded-full bg-surface-container text-fg-primary shadow-large outline-none transition-[opacity,transform] duration-200 ease-out focus-visible:ring-3 focus-visible:ring-ring/50",
            awayFromBottom ? "opacity-100" : "pointer-events-none translate-y-1 opacity-0",
          )}
        >
          <ArrowDown className="size-4.5" />
        </button>
        {footer}
      </div>
    </div>
  );
}
