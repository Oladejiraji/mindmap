"use client";

import { useMemo } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";

import { handleError } from "@/lib/handle-error";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";

export function NodeChat({ nodeId }: { nodeId: Id<"nodes"> }) {
  const { data: messages, isLoading, error, refetch } = useAuthedConvexQuery(api.messages.listByNode, { nodeId });
  const { data: proposalList } = useAuthedConvexQuery(api.proposals.listByNode, { nodeId });
  const proposals = useMemo(
    () => new Map((proposalList ?? []).map((p) => [p.messageId as string, p])),
    [proposalList],
  );
  const sendMessage = useMutation(api.chat.send);
  const retryReply = useMutation(api.chat.retry);
  const stopReply = useMutation(api.chat.stop);

  const isStreaming = messages?.some((m) => m.isStreaming) ?? false;

  // Resolves once the message is saved (the reply streams in after);
  // rejecting keeps the text in the box.
  const handleSend = async (content: string) => {
    try {
      await sendMessage({ nodeId, content });
    } catch (err) {
      handleError(err, "Failed to send message");
      throw err;
    }
  };
  const handleRetry = () => {
    retryReply({ nodeId }).catch((err) => handleError(err, "Couldn't try again"));
  };
  const handleStop = () => {
    stopReply({ nodeId }).catch((err) => handleError(err, "Couldn't stop the reply"));
  };

  return (
    <div className="flex h-full flex-col items-center overflow-y-auto">
      <div className="flex w-full max-w-175 min-h-full flex-col">
        {error ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-body-base text-fg-secondary">
              Couldn&apos;t load this conversation.
            </p>
            <button
              onClick={() => void refetch()}
              className="text-body-base font-medium text-fg-primary underline-offset-4 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <MessageList
            messages={messages ?? []}
            isLoading={isLoading}
            isStreaming={isStreaming}
            proposals={proposals}
            onRetry={handleRetry}
          />
        )}
        <div className="sticky bottom-0 bg-background">
          <ChatInput
            onSend={handleSend}
            busy={isStreaming}
            onStop={handleStop}
            disabled={!!error}
            className="px-2 pt-3 pb-2"
          />
        </div>
      </div>
    </div>
  );
}
