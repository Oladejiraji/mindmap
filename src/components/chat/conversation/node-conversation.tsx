"use client";

import { useMemo, type ReactNode } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { handleError } from "@/lib/handle-error";
import { ConversationSkeleton } from "./conversation-skeleton";
import { MessageItem } from "./message-item";

/*
 * One node's conversation: its messages, with what each reply came with
 * (a suggested edit, Try again when it failed). Every chat renders
 * messages through this, so they all show the same things. The chat
 * around it (panel, Chat view) owns the layout, scrolling and composer.
 */
export function NodeConversation({
  nodeId,
  header,
  empty = null,
  loading = <ConversationSkeleton />,
  parentNotes,
  onBranch,
}: {
  nodeId: Id<"nodes">;
  /** Above the messages, shown only when there are some. */
  header?: ReactNode;
  /** In place of the messages when there are none. */
  empty?: ReactNode;
  /** While the messages load. */
  loading?: ReactNode;
  /** Titles of the parent nodes with notes: shown above each reply as what it read. */
  parentNotes?: string[];
  /** Adds "Branch from here" (and Copy) under each finished reply. */
  onBranch?: () => void;
}) {
  const { data: messages, isLoading } = useAuthedConvexQuery(api.messages.listByNode, { nodeId });
  const { data: proposalList } = useAuthedConvexQuery(api.proposals.listByNode, { nodeId });
  const proposals = useMemo(
    () => new Map((proposalList ?? []).map((p) => [p.messageId as string, p])),
    [proposalList],
  );
  const retryReply = useMutation(api.chat.retry);
  const retry = () => {
    retryReply({ nodeId }).catch((err) => handleError(err, "Couldn't try again"));
  };

  if (isLoading) return loading;
  if (!messages?.length) return empty;
  return (
    <>
      {header}
      <div className="flex flex-col gap-6">
        {messages.map((message, i) => (
          <MessageItem
            key={message._id}
            message={message}
            proposal={proposals.get(message._id)}
            priorMessages={i}
            parentNotes={parentNotes}
            // Only the last reply can be tried again.
            onRetry={i === messages.length - 1 ? retry : undefined}
            onBranch={onBranch}
          />
        ))}
      </div>
    </>
  );
}
