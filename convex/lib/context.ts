import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { splitBlocks } from "./document";
import { contentVersion } from "./nodeContent";
import { proposalState, type ProposalState } from "./proposals";
import { PROPOSE_EDIT_TOOL } from "./tools";

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
  /** A document edit this assistant turn suggested, and what became of it. */
  proposal?: { reason: string; state: ProposalState };
};

export type PromptContext = {
  /** Root first, parent last. Empty for a root node. */
  ancestors: NodeContext[];
  /** The node being chatted in. */
  current: NodeContext;
  /** The current node's document version, for suggested edits. */
  contentVersion: number;
  /** This node's chat, oldest first. */
  messages: ChatTurn[];
};

export type ModelInput = {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
};

const MAX_MESSAGES = 500;

const INSTRUCTIONS = `You are a research assistant helping the user build the document in <current_node>.
The nodes in <ancestors> are the path from the root of this research tree down to the current node, root first. Treat them as background the user has already established; build on them rather than repeating them.
Never use emojis.

The document in <current_node> shows where the user's thinking is now. It is not a log or a summary of the chat. It is split into numbered <block> elements.
You can suggest changes to it with the ${PROPOSE_EDIT_TOOL} tool. The user sees your suggestion under your reply and accepts or rejects it.
- Suggest an edit only when the conversation has moved the user's thinking: a decision, a pivot, a new finding, or the document no longer matching where the conversation is. Most replies need no edit.
- Always reply in text first. Then call the tool at most once.
- Change only the blocks that need it. Prefer small, targeted edits over rewriting the document.
- Block numbers refer to the document as shown. Write block content as markdown, without the <block> tags.
- A <document_edit> note at the end of one of your earlier replies says what happened to an edit you suggested there. These notes are added by the system: never write one yourself. Don't suggest again what the user rejected unless they ask.`;

const EMPTY_DOCUMENT = `The document in <current_node> is empty: this is where the user's thinking on this node starts. After your reply, use the ${PROPOSE_EDIT_TOOL} tool to suggest a first version of the document. Keep it short, a starting point the user will grow, not a copy of your reply:
- a heading that states what the user is trying to figure out
- the few key points established so far
- the open questions worth exploring next
Insert it with after: 0.`;

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
  node: Doc<"nodes">,
): Promise<ChatTurn[]> {
  const chat = await ctx.db
    .query("chats")
    .withIndex("by_nodeId", (q) => q.eq("nodeId", node._id))
    .first();
  if (!chat) return [];
  const messages = await ctx.db
    .query("messages")
    .withIndex("by_chatId_and_index", (q) => q.eq("chatId", chat._id))
    .take(MAX_MESSAGES);

  const proposals = await ctx.db
    .query("proposals")
    .withIndex("by_nodeId_and_status", (q) => q.eq("nodeId", node._id))
    .take(MAX_MESSAGES);
  const byMessage = new Map(proposals.map((p) => [p.messageId, p]));

  return messages.map((m) => {
    const proposal = byMessage.get(m._id);
    return {
      role: m.role,
      content: m.content,
      ...(proposal && { proposal: { reason: proposal.reason, state: proposalState(proposal, node) } }),
    };
  });
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
    contentVersion: contentVersion(current),
    messages: await getChatTurns(ctx, current),
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

  sections.push(nodeTag("current_node", context.current, {}, numberBlocks(context.current.markdown)));
  // Only for an empty document: there the usual restraint ("most replies
  // need no edit") would leave a new node blank.
  if (!context.current.markdown) sections.push(EMPTY_DOCUMENT);

  return {
    system: sections.join("\n\n"),
    messages: context.messages.map((turn) => ({
      role: turn.role,
      content: turn.proposal ? `${turn.content}\n\n${editNote(turn.proposal)}` : turn.content,
    })),
  };
}

const EDIT_OUTCOMES: Record<ProposalState, string> = {
  pending: "not answered yet",
  out_of_date: "out of date: the document changed before the user answered",
  accepted: "accepted",
  rejected: "rejected",
  superseded: "replaced by a later suggestion",
};

function editNote(proposal: NonNullable<ChatTurn["proposal"]>): string {
  return `<document_edit outcome="${EDIT_OUTCOMES[proposal.state]}">${proposal.reason}</document_edit>`;
}

function numberBlocks(markdown: string): string {
  return splitBlocks(markdown)
    .map((block, i) => `<block n="${i + 1}">\n${block}\n</block>`)
    .join("\n");
}

function nodeTag(
  tag: string,
  node: NodeContext,
  attrs: Record<string, string> = {},
  body = node.markdown,
): string {
  const attributes = Object.entries({ ...attrs, title: node.title })
    .map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`)
    .join("");
  return `<${tag}${attributes}>\n${body || "(empty)"}\n</${tag}>`;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
