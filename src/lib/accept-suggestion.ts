import type { Doc, Id } from "@convex/dataModel";
import { placeBranches } from "@/lib/layout";
import { skippedBranches, skippedEdits, type EditPreviewState } from "@/lib/edit-preview";

/**
 * Where a suggestion's branches go on the canvas: one slot per branch,
 * under the node, right of its children. The canvas shows them there
 * before they're accepted, and accepting puts them there.
 */
export function branchSlots(nodes: Doc<"nodes">[] | undefined, nodeId: string, count: number) {
  return nodes && count > 0 ? placeBranches(nodes, nodeId, count) : [];
}

/**
 * What to send when accepting a suggestion: the edits and branches left
 * out, and where each kept branch goes (where the canvas showed it).
 */
export function acceptArgs(
  proposalId: Id<"proposals">,
  nodeId: Id<"nodes">,
  branchCount: number,
  nodes: Doc<"nodes">[] | undefined,
  preview: EditPreviewState,
) {
  const skip = [...skippedEdits(preview, proposalId)];
  const skipBranches = [...skippedBranches(preview, proposalId)];
  const slots = branchSlots(nodes, nodeId, branchCount);
  const positions = slots.flatMap((position, branch) => (skipBranches.includes(branch) ? [] : [{ branch, position }]));
  return { proposalId, skip, skipBranches, positions };
}
