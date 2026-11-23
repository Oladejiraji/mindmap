import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/*
 * A saved project view is the project URL's query string. Only these keys
 * are kept; the ones holding a node id are checked when the view is read,
 * since a node may have been deleted since.
 */

// chat: a node's chat full screen.
const KEYS = ["view", "node", "panel", "tab", "chat"] as const;
const NODE_KEYS = new Set(["node", "panel", "chat"]);
const MAX_SEARCH = 300;

/** Keeps only the keys we restore, in a fixed order. */
export function cleanSearch(search: string): string {
  const from = new URLSearchParams(search.slice(0, MAX_SEARCH * 2));
  const kept = new URLSearchParams();
  for (const key of KEYS) {
    const value = from.get(key);
    if (value) kept.set(key, value);
  }
  return kept.toString().slice(0, MAX_SEARCH);
}

/**
 * The saved query for a project, with any node that no longer exists (or
 * belongs to another project) dropped, and what depended on it: the chat
 * view needs its node, the panel's tab needs the panel.
 */
export async function readView(ctx: QueryCtx, userId: string, threadId: Id<"threads">): Promise<string> {
  const view = await ctx.db
    .query("projectViews")
    .withIndex("by_userId_and_threadId", (q) => q.eq("userId", userId).eq("threadId", threadId))
    .first();
  if (!view?.search) return "";
  const params = new URLSearchParams(view.search);
  for (const key of NODE_KEYS) {
    const id = params.get(key);
    if (!id) continue;
    const nodeId = ctx.db.normalizeId("nodes", id);
    const node = nodeId ? await ctx.db.get(nodeId) : null;
    if (!node || node.threadId !== threadId) params.delete(key);
  }
  if (!params.has("node")) params.delete("view");
  if (!params.has("panel")) params.delete("tab");
  return params.toString();
}

/** Removes every saved view of a project, e.g. when it's deleted. */
export async function deleteViewsFor(ctx: MutationCtx, threadId: Id<"threads">) {
  const views = await ctx.db
    .query("projectViews")
    .withIndex("by_threadId", (q) => q.eq("threadId", threadId))
    .take(100);
  for (const view of views) await ctx.db.delete(view._id);
}
