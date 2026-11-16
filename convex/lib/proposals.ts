import type { Doc } from "../_generated/dataModel";
import { contentVersion } from "./nodeContent";

/**
 * Where a suggested edit stands, as the user and the AI see it. A pending
 * suggestion whose document has changed since is out of date: accepting it
 * would apply edits to blocks that may no longer be there.
 */
export type ProposalState = "pending" | "out_of_date" | "accepted" | "rejected" | "superseded";

export function proposalState(proposal: Doc<"proposals">, node: Doc<"nodes">): ProposalState {
  if (proposal.status === "pending" && proposal.baseVersion !== contentVersion(node)) {
    return "out_of_date";
  }
  return proposal.status;
}
