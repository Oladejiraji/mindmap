"use client";

import { useState } from "react";
import type { Id } from "@convex/dataModel";

import { useNodeContextMessages } from "@/services/messages/queries";
import { useSendMessage } from "@/services/chat/actions";
import { showError } from "@/lib/toast";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";

export function NodeChat({
  threadId,
  nodeId,
}: {
  threadId: Id<"threads">;
  nodeId: Id<"nodes">;
}) {
  const { items, targetMessages, isLoading } = useNodeContextMessages(
    threadId,
    nodeId,
  );
  const sendMessage = useSendMessage();
  const [isSending, setIsSending] = useState(false);

  const isStreaming = targetMessages.some((m) => m.isStreaming) ?? false;
  const isBusy = isSending || isStreaming;

  const handleSend = async (content: string) => {
    setIsSending(true);
    try {
      await sendMessage({ nodeId, content });
    } catch (err) {
      showError(err, "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100svh-3.5rem)] flex-col items-center">
      <div className="flex w-full max-w-175 flex-1 flex-col overflow-hidden">
        <MessageList items={items} isLoading={isLoading} />
        <ChatInput onSend={handleSend} disabled={isBusy} />
      </div>
    </div>
  );
}
