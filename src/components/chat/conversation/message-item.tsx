"use client";

import type { Doc, Id } from "@convex/dataModel";
import { RenderIf } from "@/components/shared/render-if";
import { MessageBubble } from "../message-bubble";
import { ProposalCard, ProposalPlaceholder, type Proposal } from "../proposal-card";
import { ReplyActions } from "./reply-actions";
import { ReplyInterrupted } from "./reply-interrupted";
import { ReplySteps } from "./reply-steps";

/** One message, with what came with it: context steps, a suggested edit, Try again, actions. */
export function MessageItem({
  nodeId,
  message,
  proposal,
  priorMessages,
  parentNotes,
  onRetry,
  onBranch,
}: {
  /** The node whose conversation it's in: a suggested edit is to it. */
  nodeId: Id<"nodes">;
  message: Doc<"messages">;
  /** The edit this reply suggested, if any. */
  proposal?: Proposal;
  /** How many messages came before it in its node. */
  priorMessages: number;
  /** Shows the context steps above a reply. */
  parentNotes?: string[];
  /** Offers Try again if this reply failed. */
  onRetry?: () => void;
  /** Shows the actions under a finished reply. */
  onBranch?: () => void;
}) {
  const isReply = message.role !== "user";
  return (
    // data-message: the chat around it finds the newest one to scroll to.
    // data-role: so it can indent replies to line up with its composer.
    <div data-message data-role={message.role} className="group/msg">
      <RenderIf condition={isReply && !!parentNotes}>
        <ReplySteps parentNotes={parentNotes ?? []} priorMessages={priorMessages} />
      </RenderIf>
      <MessageBubble message={message} />
      {proposal && <ProposalCard proposal={proposal} nodeId={nodeId} />}
      <RenderIf condition={!proposal && !!message.isStreaming && !!message.draftingEdit}>
        <ProposalPlaceholder nodeId={nodeId} draft={message.draftSuggestion} />
      </RenderIf>
      <RenderIf condition={message.interrupted !== undefined}>
        <ReplyInterrupted failed={message.interrupted === "failed"} onRetry={onRetry} />
      </RenderIf>
      {isReply && !message.isStreaming && onBranch && (
        <ReplyActions content={message.content} onBranch={onBranch} />
      )}
    </div>
  );
}
