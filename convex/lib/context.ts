import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

/*
 * What the AI sees when you chat in a node, in two steps:
 *
 *   buildPromptContext  gathers: which nodes and messages are relevant (data only).
 *   toModelInput        formats: how that data is presented to the model (all prompt text).
 *
 * Context flows down the tree through block content only: the ancestor chain
 * (root → parent) plus the current node. Siblings never leak in, and ancestor
 * chats are never inherited.
 */

export type NodeContext = {
  nodeId: Id<"nodes">;
  title: string;
  markdown: string;
};

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export type PromptContext = {
  /** Root first, parent last. Empty for a root node. */
  ancestors: NodeContext[];
  /** The node being chatted in. */
  current: NodeContext;
  /** This node's chat, oldest first. */
  messages: ChatTurn[];
};

export type ModelInput = {
  system: string;
  messages: ChatTurn[];
};

const MAX_MESSAGES = 500;

const INSTRUCTIONS = `You are a research assistant helping the user build the document in <current_node>.
The nodes in <ancestors> are the path from the root of this research tree down to the current node, root first. Treat them as background the user has already established; build on them rather than repeating them.
Never use emojis.`;

// ---------------------------------------------------------------------------
// Gathering

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

async function getChatTurns(
  ctx: QueryCtx,
  nodeId: Id<"nodes">,
): Promise<ChatTurn[]> {
  const chat = await ctx.db
    .query("chats")
    .withIndex("by_nodeId", (q) => q.eq("nodeId", nodeId))
    .first();
  if (!chat) return [];
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_chatId_and_index", (q) => q.eq("chatId", chat._id))
    .take(MAX_MESSAGES);
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

function toNodeContext(node: Doc<"nodes">): NodeContext {
  return {
    nodeId: node._id,
    title: node.title,
    markdown: node.content?.trim() ?? "",
  };
}

export async function buildPromptContext(
  ctx: QueryCtx,
  nodeId: Id<"nodes">,
): Promise<PromptContext | null> {
  const chain = await walkAncestors(ctx, nodeId);
  const current = chain.at(-1);
  if (!current) return null;

  return {
    ancestors: chain.slice(0, -1).map(toNodeContext),
    current: toNodeContext(current),
    messages: await getChatTurns(ctx, current._id),
  };
}

// ---------------------------------------------------------------------------
// Formatting

export function toModelInput(context: PromptContext): ModelInput {
  const sections = [INSTRUCTIONS];

  if (context.ancestors.length > 0) {
    const last = context.ancestors.length - 1;
    const nodes = context.ancestors.map((node, i) =>
      nodeTag("node", node, { relation: i === last ? "parent" : i === 0 ? "root" : "ancestor" }),
    );
    sections.push(`<ancestors>\n${nodes.join("\n")}\n</ancestors>`);
  }

  sections.push(nodeTag("current_node", context.current));

  return { system: sections.join("\n\n"), messages: context.messages };
}

function nodeTag(
  tag: string,
  node: NodeContext,
  attrs: Record<string, string> = {},
): string {
  const attributes = Object.entries({ ...attrs, title: node.title })
    .map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`)
    .join("");
  const body = node.markdown || "(empty)";
  return `<${tag}${attributes}>\n${body}\n</${tag}>`;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
