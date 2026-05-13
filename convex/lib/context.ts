import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

async function getChatMessages(
  ctx: QueryCtx,
  nodeId: Id<"nodes">,
): Promise<Doc<"messages">[]> {
  const chat = await ctx.db
    .query("chats")
    .withIndex("by_nodeId", (q) => q.eq("nodeId", nodeId))
    .first();
  if (!chat) return [];
  return await ctx.db
    .query("messages")
    .withIndex("by_chatId_and_index", (q) => q.eq("chatId", chat._id))
    .take(500);
}

export async function walkAncestors(
  ctx: QueryCtx,
  nodeId: Id<"nodes">,
  maxDepth = 100,
): Promise<Doc<"nodes">[]> {
  const chain: Doc<"nodes">[] = [];
  let current = await ctx.db.get(nodeId);
  let depth = 0;
  while (current && depth < maxDepth) {
    chain.unshift(current);
    if (!current.parentId) break;
    current = await ctx.db.get(current.parentId);
    depth++;
  }
  return chain;
}

export async function buildPromptContext(
  ctx: QueryCtx,
  nodeId: Id<"nodes">,
): Promise<ChatMessage[]> {
  const chain = await walkAncestors(ctx, nodeId);
  if (chain.length === 0) return [];

  const context: ChatMessage[] = [];

  const ancestorContent = chain
    .slice(0, -1)
    .filter((node) => node.content)
    .map((node) => node.content!)
    .join("\n\n");

  if (ancestorContent) {
    context.push({
      role: "system",
      content: `Research context from parent nodes:\n\n${ancestorContent}`,
    });
  }

  const targetNode = chain[chain.length - 1];
  const messages = await getChatMessages(ctx, targetNode._id);
  for (const msg of messages) {
    context.push({ role: msg.role, content: msg.content });
  }

  return context;
}
