import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { normalizeTitle, UNTITLED } from "./lib/validation";
import { saveContent } from "./lib/nodeContent";
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

/**
 * Names an untitled node from the AI's suggestion, and its project too
 * when it's the root. Leaves it alone if the user named it meanwhile.
 */
export const setGeneratedTitle = internalMutation({
  args: { nodeId: v.id("nodes"), title: v.string() },
  handler: async (ctx, args) => {
    const node = await ctx.db.get(args.nodeId);
    if (!node || node.title !== UNTITLED) return null;
    const title = normalizeTitle(args.title, "Node title");
    await ctx.db.patch(node._id, { title });
    if (node.parentId === null) {
      await ctx.db.patch(node.threadId, { name: title, updatedAt: Date.now() });
    }
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
      title: UNTITLED,
      position: args.position,
    });

    return { childId };
  },
});

export const updateContent = userMutation({
  args: {
    nodeId: v.id("nodes"),
    /** Markdown. */
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const node = await requireNode(ctx, args.nodeId);
    await saveContent(ctx, node, args.content);
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

    await deleteNodeAndChat(ctx, args.nodeId);
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
      await deleteNodeAndChat(ctx, id);
    }

    return { deletedCount: toDelete.length };
  },
});

/** Deletes a node with its chat, messages and suggested edits. */
async function deleteNodeAndChat(ctx: MutationCtx, nodeId: Id<"nodes">) {
  const proposals = await ctx.db
    .query("proposals")
    .withIndex("by_nodeId_and_status", (q) => q.eq("nodeId", nodeId))
    .take(500);
  for (const proposal of proposals) {
    await ctx.db.delete(proposal._id);
  }

  const chat = await ctx.db
    .query("chats")
    .withIndex("by_nodeId", (q) => q.eq("nodeId", nodeId))
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

  await ctx.db.delete(nodeId);
}
