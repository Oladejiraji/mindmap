"use client";

import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { Button } from "@/components/ui/button";
import { RenderIf } from "@/components/shared/render-if";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { useConvexMutation } from "@/lib/use-convex-mutation";
import { handleError } from "@/lib/handle-error";
import { clearEditPreview } from "@/lib/edit-preview";

/**
 * Over a node's document while a suggested edit to it is waiting: why,
 * how much changes, Accept and Reject. The same suggestion as the card
 * in the chat, so answering either answers both.
 */
export function SuggestionBar({ nodeId }: { nodeId: Id<"nodes"> }) {
  const { data: proposals } = useAuthedConvexQuery(api.proposals.listByNode, { nodeId });
  const proposal = proposals?.find((p) => p.state === "pending");
  const accept = useConvexMutation(api.proposals.accept);
  const reject = useConvexMutation(api.proposals.reject);
  const busy = accept.isPending || reject.isPending;

  if (!proposal) return null;
  const count = proposal.changes?.length ?? 0;
  const answer = (action: typeof accept, message: string) => () =>
    action
      .mutate({ proposalId: proposal._id })
      .then(() => clearEditPreview(nodeId))
      .catch((err) => handleError(err, message));

  return (
    <section
      aria-label="Suggested edit"
      className="flex items-center gap-2 rounded-2xl bg-brand-subtle py-2 pr-2 pl-3 motion-safe:animate-in motion-safe:fade-in-0"
    >
      <div className="min-w-0 flex-1">
        <p className="text-caption-lg font-medium text-brand-fg">
          Suggested edit
          <RenderIf condition={count > 0}>
            {" "}· {count} {count === 1 ? "change" : "changes"}
          </RenderIf>
        </p>
        <p className="truncate text-caption-lg text-fg-secondary" title={proposal.reason}>
          {proposal.reason}
        </p>
      </div>
      <Button size="xs" variant="ghost" disabled={busy} onClick={answer(reject, "Failed to reject the edit")}>
        Reject
      </Button>
      <Button size="xs" isLoading={accept.isPending} disabled={busy} onClick={answer(accept, "Failed to apply the edit")}>
        Accept
      </Button>
    </section>
  );
}
