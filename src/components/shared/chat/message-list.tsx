"use client";

import { useRef, useCallback } from "react";
import type { ChatItem } from "@/services/messages/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "./message-bubble";

export function MessageList({
  items,
  isLoading,
}: {
  items: ChatItem[];
  isLoading: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastItemRef = useCallback((node: HTMLDivElement | null) => {
    node?.scrollIntoView({ behavior: "smooth" });
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 px-4 py-6">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-48 rounded-lg" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-4 w-1/2 rounded" />
          <Skeleton className="h-4 w-2/3 rounded" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-2/3 rounded" />
          <Skeleton className="h-4 w-1/2 rounded" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">
          No messages yet. Send one to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const key = item.kind === "message" ? item.message._id : item.id;
        return (
          <div key={key} ref={isLast ? lastItemRef : undefined}>
            {item.kind === "message" ? (
              <MessageBubble message={item.message} />
            ) : (
              <BranchMarker fromTitle={item.fromTitle} intoTitle={item.intoTitle} />
            )}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

function BranchMarker({
  fromTitle,
  intoTitle,
}: {
  fromTitle: string;
  intoTitle: string;
}) {
  return (
    <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
      <div className="h-px flex-1 bg-border" />
      <span>
        Branched from <span className="text-foreground">{fromTitle}</span> into{" "}
        <span className="text-foreground">{intoTitle}</span>
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
