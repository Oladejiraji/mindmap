"use client";

import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { Button } from "@/components/ui/button";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { useConvexMutation } from "@/lib/use-convex-mutation";
import { handleError } from "@/lib/handle-error";
import { isPreviewed, toggleEditPreview, useEditPreview } from "@/lib/edit-preview";

/**
 * Floats over a node's document while a suggested edit to it is waiting:
 * why, Preview, Reject and Accept. The same suggestion as the card
 * in the chat, so answering either answers both.
 */
export function SuggestionBar({ nodeId }: { nodeId: Id<"nodes"> }) {
  const { data: proposals } = useAuthedConvexQuery(api.proposals.listByNode, { nodeId });
  const proposal = proposals?.find((p) => p.state === "pending");
  const accept = useConvexMutation(api.proposals.accept);
  const reject = useConvexMutation(api.proposals.reject);
  const busy = accept.isPending || reject.isPending;
  const previewState = useEditPreview();

  if (!proposal) return null;
  const previewing = isPreviewed(previewState, proposal._id);
  const answer = (action: typeof accept, message: string) => () =>
    action
      .mutate({ proposalId: proposal._id })
      .catch((err) => handleError(err, message));

  return (
    <section
      aria-label="Suggested edit"
      className="flex items-center gap-1 rounded-2xl bg-white py-1.5 pr-1.5 pl-3.5 shadow-large motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2"
    >
      <p className="min-w-0 flex-1 truncate text-body-sm text-fg-secondary" title={proposal.reason}>
        {proposal.reason}
      </p>
      {/* Marks the edit in the document, and on the canvas node. */}
      <Button
        size="xs"
        variant="ghost"
        aria-pressed={previewing}
        onClick={() => toggleEditPreview(proposal._id)}
      >
        {previewing ? "Exit preview" : "Preview"}
      </Button>
      <Button size="xs" variant="ghost" disabled={busy} onClick={answer(reject, "Failed to reject the edit")}>
        Reject
      </Button>
      <Button size="xs" isLoading={accept.isPending} disabled={busy} onClick={answer(accept, "Failed to apply the edit")}>
        Accept
      </Button>
    </section>
  );
}
