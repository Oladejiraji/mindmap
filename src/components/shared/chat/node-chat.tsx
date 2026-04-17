"use client";

import { useState } from "react";
import type { Id } from "@convex/dataModel";

import { useMessagesByNode } from "@/services/messages/queries";
import { useSendMessage } from "@/services/chat/actions";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";

export function NodeChat({
  nodeId,
}: {
  threadId: Id<"threads">;
  nodeId: Id<"nodes">;
}) {
  const { data: messages, isLoading } = useMessagesByNode(nodeId);
  const sendMessage = useSendMessage();
  const [isSending, setIsSending] = useState(false);

  const isStreaming = messages?.some((m) => m.isStreaming) ?? false;
  const isBusy = isSending || isStreaming;

  const handleSend = async (content: string) => {
    setIsSending(true);
    try {
      await sendMessage({ nodeId, content });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100svh-3.5rem)] flex-col items-center">
      <div className="flex w-full max-w-175 flex-1 flex-col overflow-hidden">
        <MessageList messages={messages ?? []} isLoading={isLoading} />
        <ChatInput onSend={handleSend} disabled={isBusy} />
      </div>
    </div>
  );
}
