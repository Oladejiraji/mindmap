import { v } from "convex/values";
import { userMutation, userQuery } from "./lib/functions";
import { requireThread } from "./lib/auth";
import { openTab } from "./lib/tabs";

/*
 * Tabs are the projects you have open. Opening a project (from Home, a
 * link or a new chat) adds its tab at the end; closing a tab only hides
 * it, the project stays on Home.
 */

/** Your open tabs, left to right (pinned first), each with its project. */
export const list = userQuery({
  args: {},
  handler: async (ctx) => {
    const tabs = await ctx.db
      .query("tabs")
      .withIndex("by_userId_and_order", (q) => q.eq("userId", ctx.userId))
      .take(100);
    const rows = await Promise.all(
      tabs.map(async (tab) => ({ tab, thread: await ctx.db.get(tab.threadId) })),
    );
    const open = rows.flatMap(({ tab, thread }) =>
      thread && thread.userId === ctx.userId ? [{ _id: tab._id, pinned: tab.pinned ?? false, thread }] : [],
    );
    // Stable: pinned and unpinned each keep their order.
    return [...open.filter((t) => t.pinned), ...open.filter((t) => !t.pinned)];
  },
});

export const open = userMutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    await requireThread(ctx, args.threadId);
    await openTab(ctx, ctx.userId, args.threadId);
    return null;
  },
});

/** Puts your tabs in this order, left to right. Tabs left out keep their place after these. */
export const reorder = userMutation({
  args: { threadIds: v.array(v.id("threads")) },
  handler: async (ctx, args) => {
    const tabs = await ctx.db
      .query("tabs")
      .withIndex("by_userId_and_order", (q) => q.eq("userId", ctx.userId))
      .take(100);
    const rank = new Map(args.threadIds.map((id, i) => [id as string, i]));
    const sorted = [...tabs].sort(
      (a, b) => (rank.get(a.threadId) ?? Infinity) - (rank.get(b.threadId) ?? Infinity) || a.order - b.order,
    );
    for (const [order, tab] of sorted.entries()) {
      if (tab.order !== order) await ctx.db.patch(tab._id, { order });
    }
    return null;
  },
});

/**
 * Pins or unpins a tab, like a browser: pinning moves it to the end of
 * the pinned tabs, unpinning to the start of the rest.
 */
export const togglePin = userMutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const tabs = await ctx.db
      .query("tabs")
      .withIndex("by_userId_and_order", (q) => q.eq("userId", ctx.userId))
      .take(100);
    const tab = tabs.find((t) => t.threadId === args.threadId);
    if (!tab) return null;
    const others = tabs.filter((t) => t._id !== tab._id);
    const pinned = others.filter((t) => t.pinned);
    const rest = others.filter((t) => !t.pinned);
    // Either way the tab lands between the other pinned tabs and the rest.
    const next = [...pinned, tab, ...rest];
    for (const [order, t] of next.entries()) {
      const isPinned = t._id === tab._id ? !tab.pinned : !!t.pinned;
      if (t.order !== order || !!t.pinned !== isPinned) await ctx.db.patch(t._id, { order, pinned: isPinned });
    }
    return null;
  },
});

export const close = userMutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    const tab = await ctx.db
      .query("tabs")
      .withIndex("by_userId_and_threadId", (q) => q.eq("userId", ctx.userId).eq("threadId", args.threadId))
      .first();
    if (tab) await ctx.db.delete(tab._id);
    return null;
  },
});
