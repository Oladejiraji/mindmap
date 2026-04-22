import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { normalizeTitle } from "./lib/validation";
import { requireThread, requireUserId } from "./lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    return await ctx.db
      .query("threads")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);
  },
});

export const get = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    return await requireThread(ctx, args.threadId);
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = normalizeTitle(args.name, "Thread name");
    const threadId = await ctx.db.insert("threads", { userId, name });
    const rootNodeId = await ctx.db.insert("nodes", {
      userId,
      threadId,
      parentId: null,
      title: name,
    });
    return { threadId, rootNodeId };
  },
});

// Cascades through every node (and its messages) in the thread. Use this
// instead of nodes.deleteLeafNode / nodes.deleteSubtree when removing a root.
export const remove = mutation({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    await requireThread(ctx, args.threadId);

    const nodes = await ctx.db
      .query("nodes")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .take(500);

    for (const node of nodes) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_nodeId_and_index", (q) => q.eq("nodeId", node._id))
        .take(500);
      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }
      await ctx.db.delete(node._id);
    }

    await ctx.db.delete(args.threadId);
    return null;
  },
});
