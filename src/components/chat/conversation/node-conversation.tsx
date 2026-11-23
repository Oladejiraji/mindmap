"use client";

import { useMemo, type ReactNode } from "react";
import { useMutation } from "convex/react";
import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { handleError } from "@/lib/handle-error";
import { markdownToPlainText } from "@/lib/markdown";
import { RenderIf } from "@/components/shared/render-if";
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
  live = false,
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
  /**
   * The conversation being written in: its current turn (your latest
   * message and what follows) fills the chat's scroll area, so your
   * message can sit at the top with the reply under it (see ChatScroller).
   * The chat sets --turn-offset to the space it keeps above and below.
   */
  live?: boolean;
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

  const item = (message: (typeof messages)[number], i: number) => (
    <MessageItem
      key={message._id}
      nodeId={nodeId}
      message={message}
      proposal={proposals.get(message._id)}
      priorMessages={i}
      parentNotes={parentNotes}
      // Only the last reply can be tried again.
      onRetry={i === messages.length - 1 ? retry : undefined}
      onBranch={onBranch}
    />
  );
  // Where the current turn starts: your latest message.
  const turnStart = live ? messages.findLastIndex((m) => m.role === "user") : -1;
  const before = turnStart < 0 ? messages : messages.slice(0, turnStart);
  const turn = turnStart < 0 ? [] : messages.slice(turnStart);
  // For screen readers: the latest finished reply, read once when it
  // finishes rather than word by word as it streams. Present from the
  // start, so opening a conversation doesn't read anything out.
  const lastReply = live
    ? messages.findLast((m) => m.role === "assistant" && !m.isStreaming && m.interrupted === undefined)
    : undefined;

  return (
    <>
      {header}
      <div className="flex flex-col gap-6">
        {before.map((message, i) => item(message, i))}
        <RenderIf condition={turn.length > 0}>
          {/* At least as tall as the scroll area (100cqh), less the space
              the chat keeps around its messages. */}
          <div className="flex min-h-[calc(100cqh-var(--turn-offset,0px))] flex-col gap-6">
            {turn.map((message, i) => item(message, turnStart + i))}
          </div>
        </RenderIf>
      </div>
      <RenderIf condition={live}>
        <p aria-live="polite" className="sr-only">
          {lastReply ? markdownToPlainText(lastReply.content) : ""}
        </p>
      </RenderIf>
    </>
  );
}
