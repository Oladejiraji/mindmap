import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { buildPromptContext, type ChatMessage } from "./lib/context";
import {
  maybeGenerateTitle,
  streamAssistantResponse,
  distillChatToContent,
} from "./lib/llm";
import { llmAction } from "./lib/functions";

export const getContext = internalQuery({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args): Promise<ChatMessage[]> => {
    return await buildPromptContext(ctx, args.nodeId);
  },
});

export const sendMessage = llmAction({
  args: {
    nodeId: v.id("nodes"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.nodes.assertOwned, { nodeId: args.nodeId });

    await ctx.runMutation(api.messages.append, {
      nodeId: args.nodeId,
      role: "user",
      content: args.content,
    });

    await Promise.all([
      streamAssistantResponse(ctx, args.nodeId),
      maybeGenerateTitle(ctx, args.nodeId, args.content),
    ]);

    return null;
  },
});

export const distillContent = llmAction({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args) => {
    await ctx.runQuery(internal.nodes.assertOwned, { nodeId: args.nodeId });

    const messages = await ctx.runQuery(api.messages.listByNode, {
      nodeId: args.nodeId,
    });
    if (!messages || messages.length === 0) return null;

    await distillChatToContent(ctx, args.nodeId, messages);

    return null;
  },
});
