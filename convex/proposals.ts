import { v, ConvexError } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireNode, requireThread } from "./lib/auth";
import { userMutation, userQuery } from "./lib/functions";
import { applyEdits, describeEdits, DocumentEditError, keepEdits, previewEdits, type DocumentChange, type PreviewBlock } from "./lib/document";
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
  /** Accepted in part: how many of its changes were kept. */
  kept?: { count: number; of: number };
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
        ...(proposal.skipped?.length && {
          kept: { count: proposal.edits.length - proposal.skipped.length, of: proposal.edits.length },
        }),
      };
    });
  },
});

/**
 * The suggested edits still waiting for an answer across a project, one
 * per node at most (a newer one replaces the older), so the canvas can
 * mark those nodes and preview them: `preview` is the node's document
 * after the edit, block by block. Out-of-date ones are left out: they
 * can't be accepted.
 */
export const pendingByThread = userQuery({
  args: { threadId: v.id("threads") },
  handler: async (
    ctx,
    args,
  ): Promise<{ nodeId: Id<"nodes">; proposalId: Id<"proposals">; reason: string; preview: PreviewBlock[] }[]> => {
    await requireThread(ctx, args.threadId);
    const nodes = await ctx.db
      .query("nodes")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .take(1000);
    const pending = [];
    for (const node of nodes) {
      const proposal = await ctx.db
        .query("proposals")
        .withIndex("by_nodeId_and_status", (q) => q.eq("nodeId", node._id).eq("status", "pending"))
        .order("desc")
        .first();
      if (proposal && proposalState(proposal, node) === "pending") {
        pending.push({
          nodeId: node._id,
          proposalId: proposal._id,
          reason: proposal.reason,
          preview: previewEdits(node.content ?? "", proposal.edits),
        });
      }
    }
    return pending;
  },
});

export const accept = userMutation({
  args: {
    proposalId: v.id("proposals"),
    /** Changes to leave out (indices into the edits): accepting in part. */
    skip: v.optional(v.array(v.number())),
  },
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

    const skip = [...new Set(args.skip ?? [])];
    let edits;
    try {
      edits = keepEdits(proposal.edits, skip);
    } catch (err) {
      if (err instanceof DocumentEditError) throw new ConvexError(err.message);
      throw err;
    }
    await saveContent(ctx, node, applyEdits(node.content ?? "", edits));
    await ctx.db.patch(proposal._id, { status: "accepted", ...(skip.length > 0 && { skipped: skip }) });
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
