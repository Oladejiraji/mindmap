"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

/*
 * A document edit the AI suggested, under the reply that made it, shaped
 * like the node it changes: the node's title, why, how much changes, and
 * a short look at the new text. Accept and Reject answer it. Kept compact
 * so a long edit doesn't take over the chat; reviewing it in full is done
 * elsewhere. Once answered, it's one line.
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

  const answer = (action: typeof accept, message: string) => () =>
    action.mutate({ proposalId: proposal._id }).catch((err) => handleError(err, message));

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

  const changes = proposal.changes ?? [];
  const counts = countChanges(changes);
  // A look at the new text; if the edit only removes, what goes.
  const added = changes.flatMap((c) => (c.after !== null ? [c.after] : []));
  const removedOnly = added.length === 0;
  const preview = removedOnly ? changes.flatMap((c) => (c.before !== null ? [c.before] : [])) : added;

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
        {/* A few lines, fading out: enough to recognise the edit. The
            canvas node's compact markdown (headings stay at text size),
            at 13px. */}
        <div
          aria-hidden
          className={cn(
            "node-markdown max-h-19 overflow-hidden text-fg-primary mask-[linear-gradient(to_bottom,black_45%,transparent)]",
            "text-[13px]! leading-[19px]! [&_:is(h1,h2,h3,h4,h5,h6)]:text-[13px]! [&_code]:text-[12px]!",
            removedOnly && "text-fg-tertiary line-through",
          )}
        >
          {/* Default escapes raw HTML: never add rehype-raw without rehype-sanitize. */}
          <Markdown remarkPlugins={[remarkGfm]}>{preview.join("\n\n")}</Markdown>
        </div>
      </div>

      <div className="flex gap-1.5 px-0.5 pb-0.5">
        <Button size="xs" isLoading={accept.isPending} disabled={busy} onClick={answer(accept, "Failed to apply the edit")}>
          Accept
        </Button>
        <Button size="xs" variant="ghost" disabled={busy} onClick={answer(reject, "Failed to reject the edit")}>
          Reject
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
        <Skeleton className="h-3 w-1/2 rounded bg-component-hover" />
      </div>
      <div aria-hidden className="h-7" />
    </section>
  );
}
