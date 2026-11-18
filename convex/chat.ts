import { v, ConvexError } from "convex/values";
import { internalAction, internalQuery, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { buildPromptContext, type PromptContext } from "./lib/context";
import { maybeGenerateTitle, streamAssistantResponse } from "./lib/llm";
import { llmMutation, userMutation } from "./lib/functions";
import { requireNode } from "./lib/auth";
import { normalizeMessageContent, UNTITLED } from "./lib/validation";
import { closeReply } from "./messages";

/*
 * Sending is a mutation that saves the user's message, creates the empty
 * reply, and schedules `respond` to write it. So the browser hears back
 * as soon as the message is saved, not when the reply ends, and a refused
 * send (not yours, a reply already running) saves nothing.
 */

/** Longer than an action can run (10 minutes), so a live reply is never cut off. */
const REPLY_TIMEOUT_MS = 11 * 60 * 1000;

const replyInProgress = () =>
  new ConvexError({ code: "REPLY_IN_PROGRESS", message: "Wait for the reply to finish, or stop it" });

export const send = llmMutation({
  args: {
    nodeId: v.id("nodes"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const node = await requireNode(ctx, args.nodeId);
    const content = normalizeMessageContent(args.content);
    const chatId = await getOrCreateChat(ctx, node._id);
    const last = await lastMessage(ctx, chatId);
    if (last?.isStreaming) throw replyInProgress();

    const index = (last?.index ?? -1) + 1;
    await ctx.db.insert("messages", { chatId, role: "user", content, index });
    await startReply(ctx, chatId, node, index + 1, node.title === UNTITLED ? content : undefined);
    return null;
  },
});

/** Writes a new reply in place of a failed one. The failed one stays in the record. */
export const retry = llmMutation({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args) => {
    const node = await requireNode(ctx, args.nodeId);
    const chatId = await getOrCreateChat(ctx, node._id);
    const last = await lastMessage(ctx, chatId);
    if (last?.isStreaming) throw replyInProgress();
    if (last?.role !== "assistant" || last.interrupted !== "failed") {
      throw new ConvexError({ code: "NOTHING_TO_RETRY", message: "The last reply didn't fail" });
    }
    await startReply(ctx, chatId, node, last.index + 1);
    return null;
  },
});

/** Ends the reply being written, keeping the text so far. The reply job notices and stops. */
export const stop = userMutation({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args) => {
    const node = await requireNode(ctx, args.nodeId);
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_nodeId", (q) => q.eq("nodeId", node._id))
      .first();
    const last = chat && (await lastMessage(ctx, chat._id));
    if (!last?.isStreaming) return null;
    await closeReply(ctx, last, { interrupted: "stopped" });
    return null;
  },
});

/** Writes one reply. Scheduled by send and retry, never called by the browser. */
export const respond = internalAction({
  args: {
    nodeId: v.id("nodes"),
    messageId: v.id("messages"),
    /** Set when the node is still untitled: name it from this message. */
    titleFrom: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await Promise.all([
      streamAssistantResponse(ctx, args.nodeId, args.messageId),
      args.titleFrom && maybeGenerateTitle(ctx, args.nodeId, args.titleFrom),
    ]);
    return null;
  },
});

export const getContext = internalQuery({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args): Promise<PromptContext | null> => {
    return await buildPromptContext(ctx, args.nodeId);
  },
});

async function startReply(
  ctx: MutationCtx,
  chatId: Id<"chats">,
  node: Doc<"nodes">,
  index: number,
  titleFrom?: string,
) {
  const messageId = await ctx.db.insert("messages", {
    chatId,
    role: "assistant",
    content: "",
    index,
    isStreaming: true,
  });
  await ctx.db.patch(chatId, { isStreaming: true });
  await ctx.scheduler.runAfter(0, internal.chat.respond, { nodeId: node._id, messageId, titleFrom });
  await ctx.scheduler.runAfter(REPLY_TIMEOUT_MS, internal.messages.expireReply, { messageId });
}

async function lastMessage(ctx: MutationCtx, chatId: Id<"chats">) {
  return await ctx.db
    .query("messages")
    .withIndex("by_chatId_and_index", (q) => q.eq("chatId", chatId))
    .order("desc")
    .first();
}

async function getOrCreateChat(ctx: MutationCtx, nodeId: Id<"nodes">): Promise<Id<"chats">> {
  const existing = await ctx.db
    .query("chats")
    .withIndex("by_nodeId", (q) => q.eq("nodeId", nodeId))
    .first();
  if (existing) return existing._id;
  return await ctx.db.insert("chats", { nodeId });
}
