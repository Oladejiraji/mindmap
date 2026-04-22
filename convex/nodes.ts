import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { normalizeTitle } from "./lib/validation";
import { requireNode, requireThread } from "./lib/auth";

export const listByThread = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    await requireThread(ctx, args.threadId);
    return await ctx.db
      .query("nodes")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .take(500);
  },
});

export const get = query({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args) => {
    return await requireNode(ctx, args.nodeId);
  },
});

export const rename = mutation({
  args: {
    nodeId: v.id("nodes"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await requireNode(ctx, args.nodeId);
    const title = normalizeTitle(args.title, "Node title");
    await ctx.db.patch(args.nodeId, { title });
    return null;
  },
});

export const updatePosition = mutation({
  args: {
    nodeId: v.id("nodes"),
    position: v.object({ x: v.number(), y: v.number() }),
  },
  handler: async (ctx, args) => {
    await requireNode(ctx, args.nodeId);
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
    const parent = await requireNode(ctx, args.parentId);

    const lastParentMessage = await ctx.db
      .query("messages")
      .withIndex("by_nodeId_and_index", (q) => q.eq("nodeId", args.parentId))
      .order("desc")
      .first();
    const branchedAt = (lastParentMessage?.index ?? -1) + 1;

    const childId = await ctx.db.insert("nodes", {
      userId: parent.userId,
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
    const parent = await requireNode(ctx, args.parentId);

    const lastParentMessage = await ctx.db
      .query("messages")
      .withIndex("by_nodeId_and_index", (q) => q.eq("nodeId", args.parentId))
      .order("desc")
      .first();
    const branchedAt = (lastParentMessage?.index ?? -1) + 1;

    const childId = await ctx.db.insert("nodes", {
      userId: parent.userId,
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
    await requireNode(ctx, args.nodeId);

    const children = await ctx.db
      .query("nodes")
      .withIndex("by_parentId", (q) => q.eq("parentId", args.nodeId))
      .first();
    if (children) throw new ConvexError("Cannot delete a node with children");

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_nodeId_and_index", (q) => q.eq("nodeId", args.nodeId))
      .take(500);
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }

    await ctx.db.delete(args.nodeId);
    return null;
  },
});

export const deleteSubtree = mutation({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args) => {
    const root = await requireNode(ctx, args.nodeId);

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
        if (child.userId !== root.userId) {
          throw new ConvexError({ code: "NOT_FOUND", message: "Not found" });
        }
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

    return { deletedCount: toDelete.length };
  },
});

// Called from actions (which can't read ctx.db directly) to verify ownership
// before performing work. Returns the node on success, throws on mismatch.
export const assertOwned = internalQuery({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args) => {
    return await requireNode(ctx, args.nodeId);
  },
});
