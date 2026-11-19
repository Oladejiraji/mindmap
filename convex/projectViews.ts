import { v } from "convex/values";
import { userMutation, userQuery } from "./lib/functions";
import { requireThread } from "./lib/auth";
import { cleanSearch, readView } from "./lib/projectViews";

/*
 * Where you last were in each project (canvas or chat view, the open
 * panel, a floating chat), so a tab, Home or a link brings you back
 * there. Zoom and pan are kept in the browser instead.
 */

/** Saves the project URL's query as where you are now. */
export const save = userMutation({
  args: { threadId: v.id("threads"), search: v.string() },
  handler: async (ctx, args) => {
    await requireThread(ctx, args.threadId);
    const search = cleanSearch(args.search);
    const existing = await ctx.db
      .query("projectViews")
      .withIndex("by_userId_and_threadId", (q) => q.eq("userId", ctx.userId).eq("threadId", args.threadId))
      .first();
    if (existing) {
      if (existing.search !== search) await ctx.db.patch(existing._id, { search });
    } else {
      await ctx.db.insert("projectViews", { userId: ctx.userId, threadId: args.threadId, search });
    }
    return null;
  },
});

/** Where you last were in one project ("" for the canvas). */
export const get = userQuery({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    await requireThread(ctx, args.threadId);
    return await readView(ctx, ctx.userId, args.threadId);
  },
});

/** Where you last were in each of your projects, for Home's links. Projects without one are left out. */
export const mine = userQuery({
  args: {},
  handler: async (ctx) => {
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_userId", (q) => q.eq("userId", ctx.userId))
      .order("desc")
      .take(100);
    const views: Record<string, string> = {};
    for (const thread of threads) {
      const search = await readView(ctx, ctx.userId, thread._id);
      if (search) views[thread._id] = search;
    }
    return views;
  },
});
