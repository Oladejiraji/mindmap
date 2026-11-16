import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { normalizeMessageContent } from "./lib/validation";
import { documentEditValidator } from "./lib/document";
import { requireNode } from "./lib/auth";
import { userQuery } from "./lib/functions";

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

/**
 * Saves the user's chat message. Internal so the browser can't write to the
 * chat directly: only `chat.sendMessage` calls it, and assistant replies have
 * their own path (startAssistantMessage → finishStreamingMessage). That keeps
 * every assistant message in the record a real model reply.
 *
 * The ownership check stays as a second guard; the caller's identity carries
 * over from the action.
 */
export const appendUserMessage = internalMutation({
  args: {
    nodeId: v.id("nodes"),
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
      role: "user",
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

/**
 * Finalizes an assistant reply, with the document edit it suggested, if any.
 * A new suggestion replaces any unanswered one for the same node: only one
 * can apply cleanly, and the newest reflects the conversation.
 */
export const finishStreamingMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    proposal: v.optional(
      v.object({
        baseVersion: v.number(),
        reason: v.string(),
        edits: v.array(documentEditValidator),
      }),
    ),
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

    const chat = await ctx.db.get(message.chatId);
    if (!chat) throw new ConvexError("Chat not found");
    await ctx.db.patch(chat._id, { isStreaming: false });

    if (args.proposal) {
      const pending = await ctx.db
        .query("proposals")
        .withIndex("by_nodeId_and_status", (q) => q.eq("nodeId", chat.nodeId).eq("status", "pending"))
        .take(100);
      for (const older of pending) {
        await ctx.db.patch(older._id, { status: "superseded" });
      }
      await ctx.db.insert("proposals", {
        ...args.proposal,
        nodeId: chat.nodeId,
        messageId: args.messageId,
        status: "pending",
      });
    }

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
