"use client";

import type { Id } from "@convex/dataModel";
import { api } from "@convex/api";
import { Button } from "@/components/ui/button";
import { useAuthedConvexQuery } from "@/lib/use-authed-query";
import { useConvexMutation } from "@/lib/use-convex-mutation";
import { handleError } from "@/lib/handle-error";
import {
  acceptLabel,
  isPreviewed,
  skippedBranches,
  skippedEdits,
  toggleEditPreview,
  useEditPreview,
} from "@/lib/edit-preview";
import { acceptArgs } from "@/lib/accept-suggestion";

/**
 * Floats over a node's document while a suggestion for it is waiting:
 * why, Preview, Reject and Accept. The same suggestion as the card in the
 * chat, so answering either answers both; Accept also adds the branches
 * it suggests (minus any skipped on the card or the canvas).
 */
export function SuggestionBar({ nodeId }: { nodeId: Id<"nodes"> }) {
  const { data: proposals } = useAuthedConvexQuery(api.proposals.listByNode, { nodeId });
  const proposal = proposals?.find((p) => p.state === "pending");
  const accept = useConvexMutation(api.proposals.accept);
  const reject = useConvexMutation(api.proposals.reject);
  const busy = accept.isPending || reject.isPending;
  const previewState = useEditPreview();
  // For where accepted branches go: where the canvas shows them.
  const { data: node } = useAuthedConvexQuery(api.nodes.get, { nodeId });
  const { data: nodes } = useAuthedConvexQuery(
    api.nodes.listByThread,
    node ? { threadId: node.threadId } : "skip",
  );

  if (!proposal) return null;
  const previewing = isPreviewed(previewState, proposal._id);
  const branchCount = proposal.branches?.length ?? 0;
  const total = (proposal.changes?.length ?? 0) + branchCount;
  const skipped = skippedEdits(previewState, proposal._id).size + skippedBranches(previewState, proposal._id).size;
  const acceptIt = () =>
    accept
      .mutate(acceptArgs(proposal._id, nodeId, branchCount, nodes, previewState))
      .catch((err) => handleError(err, "Failed to apply the suggestion"));
  const rejectIt = () =>
    reject.mutate({ proposalId: proposal._id }).catch((err) => handleError(err, "Failed to reject the suggestion"));

  return (
    <section
      aria-label="Suggestion"
      className="flex items-center gap-1 rounded-2xl bg-white py-1.5 pr-1.5 pl-3.5 shadow-large motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2"
    >
      <p className="min-w-0 flex-1 truncate text-body-sm text-fg-secondary" title={proposal.reason}>
        {proposal.reason}
      </p>
      {/* Marks the edit in the document, and on the canvas. */}
      <Button size="xs" variant="ghost" aria-pressed={previewing} onClick={() => toggleEditPreview(proposal._id)}>
        {previewing ? "Exit preview" : "Preview"}
      </Button>
      <Button size="xs" variant="ghost" disabled={busy} onClick={rejectIt}>
        Reject
      </Button>
      <Button size="xs" isLoading={accept.isPending} disabled={busy || skipped >= total} onClick={acceptIt}>
        {acceptLabel(skipped, total)}
      </Button>
    </section>
  );
}
