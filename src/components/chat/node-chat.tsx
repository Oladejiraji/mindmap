"use client";

import { useMemo, useState } from "react";
import { useAction } from "convex/react";
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
  const sendMessage = useAction(api.chat.sendMessage);
  const [isSending, setIsSending] = useState(false);

  const isStreaming = messages?.some((m) => m.isStreaming) ?? false;
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
          <MessageList messages={messages ?? []} isLoading={isLoading} isStreaming={isStreaming} proposals={proposals} />
        )}
        <div className="sticky bottom-0 bg-background">
          <ChatInput onSend={handleSend} disabled={isBusy || !!error} className="px-2 pt-3 pb-2" />
        </div>
      </div>
    </div>
  );
}
