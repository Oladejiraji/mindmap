"use client";

import type { FunctionReturnType } from "convex/server";
import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { BranchIcon } from "@/lib/svg";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RenderIf } from "@/components/shared/render-if";
import { useConvexMutation } from "@/lib/use-convex-mutation";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { handleError } from "@/lib/handle-error";
import { cn } from "@/lib/utils";
import { isPreviewed, toggleEditPreview, useEditPreview } from "@/lib/edit-preview";

/*
 * A document edit the AI suggested, under the reply that made it, shaped
 * like the node it changes: the node's title, why, and how much changes.
 * Accept and Reject answer it. Kept compact so a long edit doesn't take
 * over the chat; the edit itself shows on the node and in its document. Once answered, it's one line.
 */

export type Proposal = FunctionReturnType<typeof api.proposals.listByNode>[number];

const OUTCOME: Record<Exclude<Proposal["state"], "pending">, string> = {
  accepted: "Accepted",
  rejected: "Rejected",
  superseded: "Replaced by a newer suggestion",
  out_of_date: "Out of date: the document changed",
};

type Change = NonNullable<Proposal["changes"]>[number];

/** "1 rewritten", "2 added", "1 removed": each kind of change, counted. */
function countChanges(changes: Change[]) {
  const rewritten = changes.filter((c) => c.before !== null && c.after !== null).length;
  const added = changes.filter((c) => c.before === null && c.after !== null).length;
  const removed = changes.filter((c) => c.before !== null && c.after === null).length;
  return [
    rewritten > 0 && `${rewritten} rewritten`,
    added > 0 && `${added} added`,
    removed > 0 && `${removed} removed`,
  ].filter((label): label is string => !!label);
}

/** The node's icon and title: the card is about this node. */
function NodeHeading({ nodeId, children }: { nodeId: Id<"nodes">; children?: React.ReactNode }) {
  const { data: node } = useAuthedConvexQuery(api.nodes.get, { nodeId });
  return (
    <div className="flex h-5 min-w-0 items-center gap-1.5 px-0.5">
      <span aria-hidden className="flex size-4 shrink-0 items-center justify-center">
        <BranchIcon pathClassName="fill-foreground" />
      </span>
      <RenderIf condition={!!node}>
        <span className="min-w-0 truncate text-body-sm font-medium text-fg-primary">{node?.title}</span>
      </RenderIf>
      <RenderIf condition={!node}>
        <Skeleton className="h-3.5 w-28 rounded bg-component-hover" />
      </RenderIf>
      {children}
    </div>
  );
}

// Built like a canvas node: a white card with the node's shadow, holding
// a grey content area.
const card = "mt-3 flex flex-col gap-2.5 rounded-[20px] bg-white p-2 shadow-node";

export function ProposalCard({ proposal, nodeId }: { proposal: Proposal; nodeId: Id<"nodes"> }) {
  const accept = useConvexMutation(api.proposals.accept);
  const reject = useConvexMutation(api.proposals.reject);
  const busy = accept.isPending || reject.isPending;
  const previewState = useEditPreview();

  const answer = (action: typeof accept, message: string) => () =>
    action
      .mutate({ proposalId: proposal._id })
      .catch((err) => handleError(err, message));

  // Answered: one line, so the chat stays a conversation.
  if (proposal.state !== "pending") {
    return (
      <div className="mt-3 flex min-w-0 items-center gap-1.5 text-caption-lg text-fg-tertiary">
        <span aria-hidden className="flex size-3.5 shrink-0 items-center justify-center">
          <BranchIcon pathClassName="fill-fg-tertiary" />
        </span>
        <span className="min-w-0 truncate">{proposal.reason}</span>
        <span aria-hidden>·</span>
        <span className="shrink-0">{OUTCOME[proposal.state]}</span>
        <RenderIf condition={proposal.state === "out_of_date"}>
          <button
            type="button"
            disabled={busy}
            onClick={answer(reject, "Failed to dismiss the edit")}
            className="ml-auto shrink-0 cursor-pointer text-fg-secondary hover:text-fg-primary"
          >
            Dismiss
          </button>
        </RenderIf>
      </div>
    );
  }

  const previewing = isPreviewed(previewState, proposal._id);
  const changes = proposal.changes ?? [];
  const counts = countChanges(changes);

  return (
    <section aria-label="Suggested edit" className={card}>
      <NodeHeading nodeId={nodeId}>
        <span className="shrink-0 text-caption-lg text-fg-tertiary">· suggested edit</span>
      </NodeHeading>

      <div className="flex flex-col gap-2 rounded-xl bg-background-2 px-3 py-2.5">
        <p className="text-caption-lg text-fg-secondary">{proposal.reason}</p>
        <RenderIf condition={counts.length > 0}>
          <ul aria-label="Changes" className="flex flex-wrap gap-1.5">
            {counts.map((label) => (
              <li
                key={label}
                className="rounded-full bg-white px-2 text-caption-lg leading-5 text-fg-secondary inset-ring-[0.5px] inset-ring-border-default"
              >
                {label}
              </li>
            ))}
          </ul>
        </RenderIf>
      </div>

      <div className="flex gap-1.5 px-0.5 pb-0.5">
        <Button size="xs" isLoading={accept.isPending} disabled={busy} onClick={answer(accept, "Failed to apply the edit")}>
          Accept
        </Button>
        <Button size="xs" variant="ghost" disabled={busy} onClick={answer(reject, "Failed to reject the edit")}>
          Reject
        </Button>
        {/* The edit is shown on the node by default; this turns that off and on. */}
        <Button
          size="xs"
          variant="outline"
          aria-pressed={previewing}
          onClick={() => toggleEditPreview(proposal._id)}
          className={cn("ml-auto", previewing && "bg-muted text-fg-primary")}
        >
          {previewing ? "Exit preview" : "Preview"}
        </Button>
      </div>
    </section>
  );
}

/**
 * Stands in for a suggested edit while the model is still writing it (a
 * few seconds after the reply text ends). Same shape as the card, so the
 * real one replaces it without a jump.
 */
export function ProposalPlaceholder({ nodeId }: { nodeId: Id<"nodes"> }) {
  return (
    <section aria-label="Drafting an edit" role="status" className={card}>
      <NodeHeading nodeId={nodeId}>
        <span className="gradient-text-shimmer shrink-0 text-caption-lg">· drafting an edit…</span>
      </NodeHeading>
      <div aria-hidden className="flex flex-col gap-2 rounded-xl bg-background-2 px-3 py-2.5">
        <Skeleton className="h-3 w-3/4 rounded bg-component-hover" />
        <Skeleton className="h-5 w-24 rounded-full bg-component-hover" />
      </div>
      <div aria-hidden className="h-7" />
    </section>
  );
}
