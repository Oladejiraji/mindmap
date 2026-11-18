import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/** Opens the project as the user's last tab. Does nothing if it's already open. */
export async function openTab(ctx: MutationCtx, userId: string, threadId: Id<"threads">) {
  const existing = await ctx.db
    .query("tabs")
    .withIndex("by_userId_and_threadId", (q) => q.eq("userId", userId).eq("threadId", threadId))
    .first();
  if (existing) return existing._id;

  const last = await ctx.db
    .query("tabs")
    .withIndex("by_userId_and_order", (q) => q.eq("userId", userId))
    .order("desc")
    .first();
  return await ctx.db.insert("tabs", { userId, threadId, order: last ? last.order + 1 : 0 });
}

/** Removes every tab for a project, e.g. when it's deleted. */
export async function deleteTabsFor(ctx: MutationCtx, threadId: Id<"threads">) {
  const tabs = await ctx.db
    .query("tabs")
    .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
    .take(100);
  for (const tab of tabs) await ctx.db.delete(tab._id);
}
