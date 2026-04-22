import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { normalizeMessageContent } from "./lib/validation";
import { requireNode } from "./lib/auth";

export const listByNode = query({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args) => {
    await requireNode(ctx, args.nodeId);
    return await ctx.db
      .query("messages")
      .withIndex("by_nodeId_and_index", (q) => q.eq("nodeId", args.nodeId))
      .take(500);
  },
});

export const append = mutation({
  args: {
    nodeId: v.id("nodes"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await requireNode(ctx, args.nodeId);
    const content = normalizeMessageContent(args.content);

    const last = await ctx.db
      .query("messages")
      .withIndex("by_nodeId_and_index", (q) => q.eq("nodeId", args.nodeId))
      .order("desc")
      .first();
    const nextIndex = (last?.index ?? -1) + 1;

    const messageId = await ctx.db.insert("messages", {
      nodeId: args.nodeId,
      role: args.role,
      content,
      index: nextIndex,
    });

    return { messageId, index: nextIndex };
  },
});

export const startAssistantMessage = internalMutation({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args) => {
    const node = await ctx.db.get(args.nodeId);
    if (!node) throw new ConvexError("Node not found");

    const last = await ctx.db
      .query("messages")
      .withIndex("by_nodeId_and_index", (q) => q.eq("nodeId", args.nodeId))
      .order("desc")
      .first();
    const nextIndex = (last?.index ?? -1) + 1;

    const messageId = await ctx.db.insert("messages", {
      nodeId: args.nodeId,
      role: "assistant",
      content: "",
      index: nextIndex,
      isStreaming: true,
    });

    await ctx.db.patch(args.nodeId, { isStreaming: true });

    return { messageId };
  },
});

export const patchStreamingContent = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new ConvexError("Message not found");
    if (!message.isStreaming) {
      throw new ConvexError("Cannot patch a finalized message");
    }
    await ctx.db.patch(args.messageId, { content: args.content });
    return null;
  },
});

export const finishStreamingMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new ConvexError("Message not found");
    if (!message.isStreaming) {
      throw new ConvexError("Message is already finalized");
    }
    await ctx.db.patch(args.messageId, {
      content: args.content,
      isStreaming: false,
    });

    await ctx.db.patch(message.nodeId, { isStreaming: false });

    return null;
  },
});
