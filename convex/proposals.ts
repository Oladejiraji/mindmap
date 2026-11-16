import { v, ConvexError } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireNode } from "./lib/auth";
import { userMutation, userQuery } from "./lib/functions";
import { applyEdits, describeEdits, type DocumentChange } from "./lib/document";
import { saveContent } from "./lib/nodeContent";
import { proposalState, type ProposalState } from "./lib/proposals";

/*
 * Document edits the AI suggested in a node's chat. The user accepts or
 * rejects each one. Accepting writes the edit to the document; the open
 * editors pick it up from there.
 */

export type ProposalView = {
  _id: Id<"proposals">;
  messageId: Id<"messages">;
  reason: string;
  state: ProposalState;
  /** What would change, while the suggestion can still be accepted. */
  changes: DocumentChange[] | null;
};

/** The node's suggested edits, for showing under the replies that made them. */
export const listByNode = userQuery({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args): Promise<ProposalView[]> => {
    const node = await requireNode(ctx, args.nodeId);
    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_nodeId_and_status", (q) => q.eq("nodeId", node._id))
      .take(500);

    return proposals.map((proposal) => {
      const state = proposalState(proposal, node);
      return {
        _id: proposal._id,
        messageId: proposal.messageId,
        reason: proposal.reason,
        state,
        changes: state === "pending" ? describeEdits(node.content ?? "", proposal.edits) : null,
      };
    });
  },
});

export const accept = userMutation({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, args) => {
    const { proposal, node } = await requireProposal(ctx, args.proposalId);
    const state = proposalState(proposal, node);
    if (state === "out_of_date") {
      throw new ConvexError({
        code: "OUT_OF_DATE",
        message: "The document changed since this edit was suggested",
      });
    }
    if (state !== "pending") throw new ConvexError("This edit was already answered");

    await saveContent(ctx, node, applyEdits(node.content ?? "", proposal.edits));
    await ctx.db.patch(proposal._id, { status: "accepted" });
    return null;
  },
});

/** Rejects a suggestion, or dismisses one that's out of date. */
export const reject = userMutation({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, args) => {
    const { proposal } = await requireProposal(ctx, args.proposalId);
    if (proposal.status !== "pending") throw new ConvexError("This edit was already answered");
    await ctx.db.patch(proposal._id, { status: "rejected" });
    return null;
  },
});

async function requireProposal(
  ctx: MutationCtx,
  proposalId: Id<"proposals">,
): Promise<{ proposal: Doc<"proposals">; node: Doc<"nodes"> }> {
  const proposal = await ctx.db.get(proposalId);
  if (!proposal) throw new ConvexError({ code: "NOT_FOUND", message: "Not found" });
  const node = await requireNode(ctx, proposal.nodeId);
  return { proposal, node };
}
