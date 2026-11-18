import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { documentEditValidator } from "./lib/document";
import { requireNode } from "./lib/auth";
import { userQuery } from "./lib/functions";

/*
 * Messages are written by chat.ts (send, retry, stop) and by the reply
 * job (internal.chat.respond) through the internal mutations below. The
 * browser has no direct way to write one.
 *
 * A reply's life: chat.send inserts it empty with isStreaming, the job
 * patches its text as it streams, and it's closed exactly once, by
 * whichever comes first:
 *   - the job finishing (finishStreamingMessage), possibly as failed
 *   - the user stopping it (chat.stop)
 *   - the timeout (expireReply), if the job died without closing it
 * Once closed, later writes from the job are ignored: the patch mutations
 * tell it the reply is closed, so it stops streaming.
 */

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

/** Saves the reply text so far. `closed` means the reply was stopped or timed out: stop streaming. */
export const patchStreamingContent = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args): Promise<{ closed: boolean }> => {
    const message = await getMessage(ctx, args.messageId);
    if (!message.isStreaming) return { closed: true };
    await ctx.db.patch(args.messageId, { content: args.content });
    return { closed: false };
  },
});

/**
 * Marks a streaming reply as writing a document edit, so the chat can show
 * a placeholder until the suggestion arrives. Also saves the reply text so
 * far: the text is done once the model moves on to the edit.
 */
export const startDraftingEdit = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, args): Promise<{ closed: boolean }> => {
    const message = await getMessage(ctx, args.messageId);
    if (!message.isStreaming) return { closed: true };
    await ctx.db.patch(args.messageId, { content: args.content, draftingEdit: true });
    return { closed: false };
  },
});

/**
 * Closes a reply with its final text and the document edit it suggested,
 * if any. A new suggestion replaces any unanswered one for the same node:
 * only one can apply cleanly, and the newest reflects the conversation.
 * Does nothing if the reply was already closed (stopped or timed out).
 */
export const finishStreamingMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    /** The model call failed. The text so far is kept. */
    failed: v.optional(v.boolean()),
    proposal: v.optional(
      v.object({
        baseVersion: v.number(),
        reason: v.string(),
        edits: v.array(documentEditValidator),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const message = await getMessage(ctx, args.messageId);
    if (!message.isStreaming) return null;
    const nodeId = await closeReply(ctx, message, {
      content: args.content,
      ...(args.failed && { interrupted: "failed" as const }),
    });

    if (args.proposal && !args.failed) {
      const pending = await ctx.db
        .query("proposals")
        .withIndex("by_nodeId_and_status", (q) => q.eq("nodeId", nodeId).eq("status", "pending"))
        .take(100);
      for (const older of pending) {
        await ctx.db.patch(older._id, { status: "superseded" });
      }
      await ctx.db.insert("proposals", {
        ...args.proposal,
        nodeId,
        messageId: args.messageId,
        status: "pending",
      });
    }

    return null;
  },
});

/**
 * Scheduled when a reply starts, for longer than the reply job can run.
 * If the reply is still open by then, the job died without closing it:
 * mark it failed so the chat isn't stuck waiting on it.
 */
export const expireReply = internalMutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message?.isStreaming) return null;
    await closeReply(ctx, message, { interrupted: "failed" });
    return null;
  },
});

/** Ends a streaming reply and frees its chat for the next message. Returns the chat's node. */
export async function closeReply(
  ctx: MutationCtx,
  message: Doc<"messages">,
  fields: { content?: string; interrupted?: "failed" | "stopped" },
) {
  await ctx.db.patch(message._id, { ...fields, isStreaming: false, draftingEdit: undefined });
  const chat = await ctx.db.get(message.chatId);
  if (!chat) throw new ConvexError("Chat not found");
  await ctx.db.patch(chat._id, { isStreaming: false });
  return chat.nodeId;
}

async function getMessage(ctx: MutationCtx, messageId: Doc<"messages">["_id"]) {
  const message = await ctx.db.get(messageId);
  if (!message) throw new ConvexError("Message not found");
  return message;
}
