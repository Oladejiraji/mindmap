import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { normalizeMessageContent } from "./lib/validation";
import { requireNode } from "./lib/auth";
import { userMutation, userQuery } from "./lib/functions";

export const listByNode = userQuery({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args) => {
    await requireNode(ctx, args.nodeId);
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_nodeId", (q) => q.eq("nodeId", args.nodeId))
      .first();
    if (!chat) return [];
    return await ctx.db
      .query("messages")
      .withIndex("by_chatId_and_index", (q) => q.eq("chatId", chat._id))
      .take(500);
  },
});

export const append = userMutation({
  args: {
    nodeId: v.id("nodes"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await requireNode(ctx, args.nodeId);
    const content = normalizeMessageContent(args.content);

    const chatId = await getOrCreateChat(ctx, args.nodeId);

    const last = await ctx.db
      .query("messages")
      .withIndex("by_chatId_and_index", (q) => q.eq("chatId", chatId))
      .order("desc")
      .first();
    const nextIndex = (last?.index ?? -1) + 1;

    const messageId = await ctx.db.insert("messages", {
      chatId,
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
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_nodeId", (q) => q.eq("nodeId", args.nodeId))
      .first();
    if (!chat) throw new ConvexError("Chat not found for node");

    const last = await ctx.db
      .query("messages")
      .withIndex("by_chatId_and_index", (q) => q.eq("chatId", chat._id))
      .order("desc")
      .first();
    const nextIndex = (last?.index ?? -1) + 1;

    const messageId = await ctx.db.insert("messages", {
      chatId: chat._id,
      role: "assistant",
      content: "",
      index: nextIndex,
      isStreaming: true,
    });

    await ctx.db.patch(chat._id, { isStreaming: true });

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

    await ctx.db.patch(message.chatId, { isStreaming: false });

    return null;
  },
});

async function getOrCreateChat(
  ctx: MutationCtx,
  nodeId: Id<"nodes">,
): Promise<Id<"chats">> {
  const existing = await ctx.db
    .query("chats")
    .withIndex("by_nodeId", (q) => q.eq("nodeId", nodeId))
    .first();
  if (existing) return existing._id;
  return await ctx.db.insert("chats", { nodeId });
}
