import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

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

export const rename = mutation({
  args: {
    nodeId: v.id("nodes"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.nodeId, { title: args.title });
    return null;
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

export const createEmptyBranch = mutation({
  args: {
    parentId: v.id("nodes"),
    position: v.optional(v.object({ x: v.number(), y: v.number() })),
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
      title: "Untitled",
      position: args.position,
    });

    return { childId };
  },
});

export const deleteLeafNode = mutation({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args) => {
    const node = await ctx.db.get(args.nodeId);
    if (!node) throw new Error("Node not found");

    const children = await ctx.db
      .query("nodes")
      .withIndex("by_parentId", (q) => q.eq("parentId", args.nodeId))
      .first();
    if (children) throw new Error("Cannot delete a node with children");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_nodeId_and_index", (q) => q.eq("nodeId", args.nodeId))
      .take(500);
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(args.nodeId);

    // If we just deleted the root, the thread has no more nodes — remove it too.
    if (node.parentId === null) {
      await ctx.db.delete(node.threadId);
    }

    return null;
  },
});

export const deleteSubtree = mutation({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args) => {
    const node = await ctx.db.get(args.nodeId);
    if (!node) throw new Error("Node not found");

    const toDelete: Id<"nodes">[] = [];
    const queue: Id<"nodes">[] = [args.nodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      toDelete.push(current);
      const children = await ctx.db
        .query("nodes")
        .withIndex("by_parentId", (q) => q.eq("parentId", current))
        .take(500);
      for (const child of children) {
        queue.push(child._id);
      }
    }

    for (const id of toDelete) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_nodeId_and_index", (q) => q.eq("nodeId", id))
        .take(500);
      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }
      await ctx.db.delete(id);
    }

    // If we just deleted the root, the thread is now empty — remove it too.
    if (node.parentId === null) {
      await ctx.db.delete(node.threadId);
    }

    return { deletedCount: toDelete.length };
  },
});
