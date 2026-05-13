import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { normalizeTitle } from "./lib/validation";
import { requireNode, requireThread } from "./lib/auth";
import { userMutation, userQuery } from "./lib/functions";

export const listByThread = userQuery({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    await requireThread(ctx, args.threadId);
    return await ctx.db
      .query("nodes")
      .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
      .take(500);
  },
});

export const get = userQuery({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args) => {
    return await requireNode(ctx, args.nodeId);
  },
});

export const rename = userMutation({
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

export const updatePosition = userMutation({
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

export const createEmptyBranch = userMutation({
  args: {
    parentId: v.id("nodes"),
    position: v.optional(v.object({ x: v.number(), y: v.number() })),
  },
  handler: async (ctx, args) => {
    const parent = await requireNode(ctx, args.parentId);

    const childId = await ctx.db.insert("nodes", {
      userId: parent.userId,
      threadId: parent.threadId,
      parentId: args.parentId,
      title: "Untitled",
      position: args.position,
    });

    return { childId };
  },
});

export const updateContent = userMutation({
  args: {
    nodeId: v.id("nodes"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await requireNode(ctx, args.nodeId);
    await ctx.db.patch(args.nodeId, { content: args.content });
    return null;
  },
});

export const deleteLeafNode = userMutation({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args) => {
    await requireNode(ctx, args.nodeId);

    const children = await ctx.db
      .query("nodes")
      .withIndex("by_parentId", (q) => q.eq("parentId", args.nodeId))
      .first();
    if (children) throw new ConvexError("Cannot delete a node with children");

    const chat = await ctx.db
      .query("chats")
      .withIndex("by_nodeId", (q) => q.eq("nodeId", args.nodeId))
      .first();
    if (chat) {
      const messages = await ctx.db
        .query("messages")
        .withIndex("by_chatId_and_index", (q) => q.eq("chatId", chat._id))
        .take(500);
      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }
      await ctx.db.delete(chat._id);
    }

    await ctx.db.delete(args.nodeId);
    return null;
  },
});

export const deleteSubtree = userMutation({
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
      const chat = await ctx.db
        .query("chats")
        .withIndex("by_nodeId", (q) => q.eq("nodeId", id))
        .first();
      if (chat) {
        const messages = await ctx.db
          .query("messages")
          .withIndex("by_chatId_and_index", (q) => q.eq("chatId", chat._id))
          .take(500);
        for (const msg of messages) {
          await ctx.db.delete(msg._id);
        }
        await ctx.db.delete(chat._id);
      }
      await ctx.db.delete(id);
    }

    return { deletedCount: toDelete.length };
  },
});

export const assertOwned = internalQuery({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args) => {
    return await requireNode(ctx, args.nodeId);
  },
});
