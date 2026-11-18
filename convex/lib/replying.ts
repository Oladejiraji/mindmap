import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Counts a reply starting (+1) or ending (-1) in a project, so its tab can
 * show one is being written. Called where every reply starts (startReply)
 * and where every reply ends, once (closeReply).
 */
export async function countReply(ctx: MutationCtx, threadId: Id<"threads">, delta: 1 | -1) {
  const thread = await ctx.db.get(threadId);
  if (!thread) return;
  await ctx.db.patch(threadId, { replying: Math.max(0, (thread.replying ?? 0) + delta) });
}
