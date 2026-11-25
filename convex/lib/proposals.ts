import { v, type Infer } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { documentEditValidator } from "./document";
import { contentVersion } from "./nodeContent";

/*
 * A suggestion the AI made in a node's chat, in up to two parts: edits to
 * the node's document, and new branches (children) under the node. A
 * node's chat can change only its own node, so every part targets it.
 */

/** A new child node the AI suggests: its title and a short starting document. */
export const proposedBranchValidator = v.object({ title: v.string(), content: v.string() });
export type ProposedBranch = Infer<typeof proposedBranchValidator>;

/** What a reply suggests, as the chat action records it. */
export const proposalContentValidator = v.object({
  /** The node's contentVersion when the AI read the document. */
  baseVersion: v.number(),
  /** One line on why, shown to the user. */
  reason: v.string(),
  /** Edits to the document. Empty when the suggestion only adds branches. */
  edits: v.array(documentEditValidator),
  branches: v.optional(v.array(proposedBranchValidator)),
});
export type ProposalContent = Infer<typeof proposalContentValidator>;

/**
 * Where a suggestion stands, as the user and the AI see it. A pending
 * suggestion with document edits whose document has changed since is out
 * of date: accepting it would apply edits to blocks that may no longer be
 * there. (Branches alone never go out of date.)
 */
export type ProposalState = "pending" | "out_of_date" | "accepted" | "rejected" | "superseded";

export function proposalState(proposal: Doc<"proposals">, node: Doc<"nodes">): ProposalState {
  if (proposal.status === "pending" && proposal.edits.length > 0 && proposal.baseVersion !== contentVersion(node)) {
    return "out_of_date";
  }
  return proposal.status;
}
