"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { EditDocumentIcon } from "@/components/icons/edit-document-icon";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/api";
import { Button } from "@/components/ui/button";
import { RenderIf } from "@/components/shared/render-if";
import { useConvexMutation } from "@/lib/use-convex-mutation";
import { handleError } from "@/lib/handle-error";
import { cn } from "@/lib/utils";

/** A block going out (red) or coming in (green), rendered as markdown. */
function ChangedBlock({
  markdown,
  kind,
}: {
  markdown: string;
  kind: "removed" | "added";
}) {
  return (
    <div
      aria-label={kind === "removed" ? "Removed" : "Added"}
      className={cn(
        "markdown-body rounded-md px-2 py-0 text-body-sm [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        kind === "removed"
          ? "bg-danger-subtle text-on-danger-subtle"
          : "bg-positive-subtle text-on-positive-subtle",
      )}
    >
      {/* Default escapes raw HTML: never add rehype-raw without rehype-sanitize. */}
      <Markdown remarkPlugins={[remarkGfm]}>{markdown}</Markdown>
    </div>
  );
}

export type Proposal = FunctionReturnType<
  typeof api.proposals.listByNode
>[number];

const OUTCOME: Record<Exclude<Proposal["state"], "pending">, string> = {
  accepted: "Accepted",
  rejected: "Rejected",
  superseded: "Replaced by a newer suggestion",
  out_of_date: "Out of date: the document changed",
};

/**
 * A document edit the AI suggested, under the reply that made it. While it
 * can be applied: what would change, with Accept and Reject. After that: one
 * line saying what happened to it.
 */
export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const accept = useConvexMutation(api.proposals.accept);
  const reject = useConvexMutation(api.proposals.reject);
  const busy = accept.isPending || reject.isPending;

  const answer = (action: typeof accept, message: string) => () =>
    action
      .mutate({ proposalId: proposal._id })
      .catch((err) => handleError(err, message));

  if (proposal.state !== "pending") {
    return (
      <div className="mt-3 flex items-center gap-2 text-caption-lg text-fg-tertiary">
        <EditDocumentIcon className="size-3.5 shrink-0" aria-hidden />
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

  return (
    <section
      aria-label="Suggested edit"
      className="mt-3 rounded-xl bg-component px-3 py-2.5"
    >
      <header className="flex items-center gap-2 text-caption-lg text-fg-secondary">
        <EditDocumentIcon className="size-3.5 shrink-0" aria-hidden />
        <span className="min-w-0">
          <span className="font-medium text-fg-primary">Suggested edit</span> ·{" "}
          {proposal.reason}
        </span>
      </header>

      <ol className="mt-2 flex flex-col gap-2">
        {proposal.changes?.map((change, i) => (
          <li key={i} className="flex flex-col gap-0.5">
            <RenderIf condition={change.before !== null}>
              <ChangedBlock markdown={change.before ?? ""} kind="removed" />
            </RenderIf>
            <RenderIf condition={change.after !== null}>
              <ChangedBlock markdown={change.after ?? ""} kind="added" />
            </RenderIf>
          </li>
        ))}
      </ol>

      <div className="mt-2.5 flex gap-1.5">
        <Button
          size="xs"
          isLoading={accept.isPending}
          disabled={busy}
          onClick={answer(accept, "Failed to apply the edit")}
        >
          Accept
        </Button>
        <Button
          size="xs"
          variant="ghost"
          className="underline-offset-4 hover:bg-transparent hover:underline aria-expanded:bg-transparent"
          disabled={busy}
          onClick={answer(reject, "Failed to reject the edit")}
        >
          Reject
        </Button>
      </div>
    </section>
  );
}
