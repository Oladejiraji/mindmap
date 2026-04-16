"use client";

import { useRef, useCallback } from "react";
import type { Message } from "@/services/messages/queries";
import { MessageBubble } from "./message-bubble";

export function MessageList({ messages }: { messages: Message[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive via ref callback on the last item
  const lastMessageRef = useCallback((node: HTMLDivElement | null) => {
    node?.scrollIntoView({ behavior: "smooth" });
  }, []);

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
