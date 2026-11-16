import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { MAX_NODE_CONTENT } from "./validation";

/** The node's document version. Missing means it was never saved. */
export function contentVersion(node: Doc<"nodes">): number {
  return node.contentVersion ?? 0;
}

/**
 * Every write to a node's document goes through here: the editor's saves
 * and accepted AI edits. Each write bumps the version, which is what makes
 * an older AI suggestion out of date.
 *
 * Callers check ownership first.
 */
export async function saveContent(
  ctx: MutationCtx,
  node: Doc<"nodes">,
  markdown: string,
): Promise<void> {
  if (markdown.length > MAX_NODE_CONTENT) {
    throw new ConvexError(`Node content exceeds ${MAX_NODE_CONTENT} characters`);
  }
  await ctx.db.patch(node._id, {
    // An empty document is stored as no content.
    content: markdown.trim() ? markdown : undefined,
    contentVersion: contentVersion(node) + 1,
  });
}
