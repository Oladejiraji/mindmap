import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { buildPromptContext, type PromptContext } from "./lib/context";
import { maybeGenerateTitle, streamAssistantResponse } from "./lib/llm";
import { llmAction } from "./lib/functions";

export const getContext = internalQuery({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args): Promise<PromptContext | null> => {
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

    await ctx.runMutation(internal.messages.appendUserMessage, {
      nodeId: args.nodeId,
      content: args.content,
    });

    await Promise.all([
      streamAssistantResponse(ctx, args.nodeId),
      maybeGenerateTitle(ctx, args.nodeId, args.content),
    ]);

    return null;
  },
});

