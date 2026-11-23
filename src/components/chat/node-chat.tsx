"use client";

import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { NodeConversation } from "./conversation";
import { NodeComposer } from "./node-composer";
import { ChatScroller } from "./chat-scroller";

/** A node's chat in the narrow side panel: its conversation and a composer. */
export function NodeChat({ nodeId }: { nodeId: Id<"nodes"> }) {
  const { data: messages, error, refetch } = useAuthedConvexQuery(api.messages.listByNode, { nodeId });
  const isStreaming = messages?.some((m) => m.isStreaming) ?? false;

  return (
    <ChatScroller
      latestKey={`${nodeId}:${messages?.length ?? 0}`}
      streaming={isStreaming}
      footer={
        <div className="mx-auto w-full max-w-175">
          <NodeComposer nodeId={nodeId} disabled={!!error} className="px-2 pt-3 pb-2" />
        </div>
      }
    >
      {error ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-body-base text-fg-secondary">Couldn&apos;t load this conversation.</p>
          <button
            onClick={() => void refetch()}
            className="text-body-base font-medium text-fg-primary underline-offset-4 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : (
        // Aligned with the composer: your bubbles to its edge (8px in),
        // replies (plain text) to its text (20px in, like the panel's
        // details and content).
        <div className="mx-auto flex w-full max-w-175 flex-1 flex-col px-2 py-6 [&_[data-role=assistant]]:px-3">
          <NodeConversation
            nodeId={nodeId}
            empty={
              <div className="flex flex-1 items-center justify-center">
                <p className="text-body-base text-fg-secondary">No messages yet. Send one to get started.</p>
              </div>
            }
          />
        </div>
      )}
    </ChatScroller>
  );
}
