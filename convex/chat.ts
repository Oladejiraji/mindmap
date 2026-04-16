import { v } from "convex/values";
import {
  action,
  internalQuery,
  type ActionCtx,
} from "./_generated/server";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";
import { buildPromptContext, type ChatMessage } from "./lib/context";

const PATCH_INTERVAL_MS = 100;

export const getContext = internalQuery({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args): Promise<ChatMessage[]> => {
    return await buildPromptContext(ctx, args.nodeId);
  },
});

async function streamAssistantResponse(
  ctx: ActionCtx,
  nodeId: Id<"nodes">,
): Promise<void> {
  const messages: ChatMessage[] = await ctx.runQuery(
    internal.chat.getContext,
    { nodeId },
  );

  const { messageId } = await ctx.runMutation(
    internal.messages.startAssistantMessage,
    { nodeId },
  );

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    messages,
  });

  let buffer = "";
  let lastPatch = Date.now();

  for await (const chunk of result.textStream) {
    buffer += chunk;
    if (Date.now() - lastPatch >= PATCH_INTERVAL_MS) {
      await ctx.runMutation(internal.messages.patchStreamingContent, {
        messageId,
        content: buffer,
      });
      lastPatch = Date.now();
    }
  }

  await ctx.runMutation(internal.messages.finishStreamingMessage, {
    messageId,
    content: buffer,
  });
}

export const sendMessage = action({
  args: {
    nodeId: v.id("nodes"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(api.messages.append, {
      nodeId: args.nodeId,
      role: "user",
      content: args.content,
    });

    await streamAssistantResponse(ctx, args.nodeId);

    return null;
  },
});

export const sendToBranch = action({
  args: {
    parentId: v.id("nodes"),
    title: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args): Promise<{ childId: Id<"nodes"> }> => {
    const { childId }: { childId: Id<"nodes"> } = await ctx.runMutation(
      api.nodes.createBranch,
      {
        parentId: args.parentId,
        title: args.title,
        firstMessageContent: args.content,
      },
    );

    await streamAssistantResponse(ctx, childId);

    return { childId };
  },
});
