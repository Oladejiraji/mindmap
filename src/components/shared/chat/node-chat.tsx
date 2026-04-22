"use client";

import { useState } from "react";
import type { Id } from "@convex/dataModel";

import { useNodeContextMessages } from "@/services/messages/queries";
import { useSendMessage } from "@/services/chat/actions";
import { handleError } from "@/lib/handle-error";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";

export function NodeChat({
  threadId,
  nodeId,
}: {
  threadId: Id<"threads">;
  nodeId: Id<"nodes">;
}) {
  const { items, targetMessages, isLoading, error, retry } =
    useNodeContextMessages(threadId, nodeId);
  const sendMessage = useSendMessage();
  const [isSending, setIsSending] = useState(false);

  const isStreaming = targetMessages.some((m) => m.isStreaming) ?? false;
  const isBusy = isSending || isStreaming;

  const handleSend = async (content: string) => {
    setIsSending(true);
    try {
      await sendMessage({ nodeId, content });
      setIsSending(false);
    } catch (err) {
      handleError(err, "Failed to send message");
      // Keep the input disabled briefly so the user can read the toast
      // before the send button becomes mashable again.
      setTimeout(() => setIsSending(false), 600);
    }
  };

  return (
    <div className="flex h-[calc(100svh-3.5rem)] flex-col items-center">
      <div className="flex w-full max-w-175 flex-1 flex-col overflow-hidden">
        {error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-sm text-muted-foreground">
              Couldn&apos;t load this conversation.
            </p>
            <button
              onClick={retry}
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <MessageList items={items} isLoading={isLoading} />
        )}
        <ChatInput onSend={handleSend} disabled={isBusy || !!error} />
      </div>
    </div>
  );
}
