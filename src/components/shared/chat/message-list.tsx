"use client";

import { useRef, useCallback } from "react";
import type { Message } from "@/services/messages/queries";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "./message-bubble";

export function MessageList({
  messages,
  isLoading,
}: {
  messages: Message[];
  isLoading: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastMessageRef = useCallback((node: HTMLDivElement | null) => {
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

  if (messages.length === 0) {
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
      {messages.map((msg, i) => (
        <div
          key={msg._id}
          ref={i === messages.length - 1 ? lastMessageRef : undefined}
        >
          <MessageBubble message={msg} />
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
