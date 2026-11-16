"use client";

import { useRef, useCallback } from "react";
import type { Doc } from "@convex/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageBubble } from "./message-bubble";
import { ProposalCard, type Proposal } from "./proposal-card";

export function MessageList({
  messages,
  isLoading,
  isStreaming,
  proposals,
}: {
  messages: Doc<"messages">[];
  isLoading: boolean;
  isStreaming: boolean;
  /** Suggested document edits, by the message that made them. */
  proposals?: Map<string, Proposal>;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const lastItemRef = useCallback((node: HTMLDivElement | null) => {
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 px-2 py-6">
        <div className="flex justify-end">
          <Skeleton className="h-10 w-48 rounded-xl" />
        </div>
        <div className="flex flex-col gap-2 px-3">
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-4 w-1/2 rounded" />
          <Skeleton className="h-4 w-2/3 rounded" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <div className="flex flex-col gap-2 px-3">
          <Skeleton className="h-4 w-2/3 rounded" />
          <Skeleton className="h-4 w-1/2 rounded" />
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-body-base text-fg-secondary">
          No messages yet. Send one to get started.
        </p>
      </div>
    );
  }

  return (
    // Aligned with the composer: your bubbles to its edge (8px in), replies
    // (plain text) to its text (20px in, like the panel's details and content)
    <div className={`flex flex-1 flex-col gap-6 px-2 py-6 ${isStreaming ? "pb-[60vh]" : ""}`}>
      {messages.map((message, i) => {
        const isLast = i === messages.length - 1;
        const proposal = proposals?.get(message._id);
        return (
          <div key={message._id} ref={isLast ? lastItemRef : undefined} className={message.role === "user" ? undefined : "px-3"}>
            <MessageBubble message={message} />
            {proposal && <ProposalCard proposal={proposal} />}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
