import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

async function getNodeMessages(
  ctx: QueryCtx,
  nodeId: Id<"nodes">,
  limit?: number,
): Promise<Doc<"messages">[]> {
  return await ctx.db
    .query("messages")
    .withIndex("by_nodeId_and_index", (q) => q.eq("nodeId", nodeId))
    .take(limit ?? 500);
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

  for (let i = 0; i < chain.length; i++) {
    const node = chain[i];
    const isTarget = i === chain.length - 1;
    const sliceLimit = isTarget ? undefined : (chain[i + 1].branchedAt ?? 0);

    const messages = await getNodeMessages(ctx, node._id, sliceLimit);
    for (const msg of messages) {
      context.push({ role: msg.role, content: msg.content });
    }
  }

  return context;
}
