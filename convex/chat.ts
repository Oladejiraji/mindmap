import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { buildPromptContext, type ChatMessage } from "./lib/context";
import { maybeGenerateTitle, streamAssistantResponse } from "./lib/llm";

export const getContext = internalQuery({
  args: { nodeId: v.id("nodes") },
  handler: async (ctx, args): Promise<ChatMessage[]> => {
    return await buildPromptContext(ctx, args.nodeId);
  },
});

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

    await Promise.all([
      streamAssistantResponse(ctx, args.nodeId),
      maybeGenerateTitle(ctx, args.nodeId, args.content),
    ]);

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
