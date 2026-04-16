import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByThread = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("nodes")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .take(500);
  },
});

export const get = query({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.nodeId);
  },
});

export const updatePosition = mutation({
  args: {
    nodeId: v.id("nodes"),
    position: v.object({ x: v.number(), y: v.number() }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.nodeId, { position: args.position });
    return null;
  },
});

export const createBranch = mutation({
  args: {
    parentId: v.id("nodes"),
    title: v.string(),
    firstMessageContent: v.string(),
  },
  handler: async (ctx, args) => {
    const parent = await ctx.db.get(args.parentId);
    if (!parent) throw new Error("Parent node not found");

    const lastParentMessage = await ctx.db
      .query("messages")
      .withIndex("by_nodeId_and_index", (q) => q.eq("nodeId", args.parentId))
      .order("desc")
      .first();
    const branchedAt = (lastParentMessage?.index ?? -1) + 1;

    const childId = await ctx.db.insert("nodes", {
      threadId: parent.threadId,
      parentId: args.parentId,
      branchedAt,
      title: args.title,
    });

    await ctx.db.insert("messages", {
      nodeId: childId,
      role: "user",
      content: args.firstMessageContent,
      index: 0,
    });

    return { childId };
  },
});
