import type { QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { applyEdits, splitBlocks } from "./document";
import { contentVersion } from "./nodeContent";
import { proposalState, type ProposalState, type ProposedBranch } from "./proposals";
import { PROPOSE_TOOL } from "./tools";

/*
 * What the AI sees when you chat in a node, in two steps:
 *
 *   buildPromptContext  gathers: which nodes and messages are relevant (data only).
 *   toModelInput        formats: how that data is presented to the model (all prompt text).
 *
 * Context flows down the tree through block content only: the ancestor chain
 * (root → parent) plus the current node. Siblings never leak in, and ancestor
 * chats are never inherited. The current node's children are listed by
 * title only, so the AI doesn't suggest a branch that's already there.
 */

export type NodeContext = {
  nodeId: Id<"nodes">;
  title: string;
  markdown: string;
};

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  /**
   * What this assistant turn suggested, and what became of it. `kept`:
   * accepted in part, with this many of its `of` changes (edits and
   * branches together).
   */
  proposal?: { reason: string; state: ProposalState; kept?: { count: number; of: number } };
};

export type PromptContext = {
  /** Root first, parent last. Empty for a root node. */
  ancestors: NodeContext[];
  /** The node being chatted in. */
  current: NodeContext;
  /** The titles of the current node's children. */
  children: string[];
  /** The current node's document version, for suggested edits. */
  contentVersion: number;
  /**
   * The suggestion waiting for an answer, if there is one: the current
   * node's document with its edits applied, and the branches it adds. The
   * model works on this draft, so a new suggestion builds on the waiting
   * one instead of dropping it.
   */
  draft?: { markdown: string; reason: string; branches: ProposedBranch[] };
  /** This node's chat, oldest first. */
  messages: ChatTurn[];
};

export type ModelInput = {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
};

const MAX_MESSAGES = 500;

const INSTRUCTIONS = `You are a research assistant helping the user build the document in <current_node>, and the branches under it.
The nodes in <ancestors> are the path from the root of this research tree down to the current node, root first. Treat them as background the user has already established; build on them rather than repeating them.
<children> lists the branches that already exist under the current node, by title.
Never use emojis.

The document in <current_node> shows where the user's thinking is now. It is not a log or a summary of the chat. It is split into numbered <block> elements.
You can suggest changes with the ${PROPOSE_TOOL} tool: edits to the document, new branches under the current node, or both in one call. The user sees your suggestion under your reply and accepts all, some or none of it.
- Suggest changes only when the conversation has moved the user's thinking: a decision, a pivot, a new finding, or the document no longer matching where the conversation is. Most replies need no suggestion.
- Always reply in text first, even if it's one sentence saying what you're suggesting. Never call the tool without replying. Then call it at most once.

Document edits:
- Change only the blocks that need it. Prefer small, targeted edits over rewriting the document.
- Block numbers refer to the document as shown. Write block content as markdown, without the <block> tags.

Branches:
- Suggest branches when a topic splits into distinct questions worth exploring on their own, or the user asks to break something out. Each one becomes a child of the current node, with a short starting document.
- Never suggest a branch that's already in <children>.
- You can only add branches under the current node: not beside it, and not elsewhere in the tree. If something belongs elsewhere, say so in your reply.

A <suggestion> note at the end of one of your earlier replies says what happened to what you suggested there. These notes are added by the system: never write one yourself. Don't suggest again what the user rejected or left out unless they ask.`;

const EMPTY_DOCUMENT = `The document in <current_node> is empty: this is where the user's thinking on this node starts. After your reply, use the ${PROPOSE_TOOL} tool to suggest a first version of the document. Keep it short, a starting point the user will grow, not a copy of your reply:
- a heading that states what the user is trying to figure out
- the few key points established so far
- the open questions worth exploring next
Insert it with after: 0.`;

const WAITING = `You suggested changes earlier that the user hasn't accepted or rejected yet (see <waiting_suggestion>). A new suggestion replaces the waiting one, so carry over what should stay:
- Its document edits are already in <current_node>: block numbers refer to the document as shown, with them in. They're kept unless your edits change them. If the user asks to drop or change any of them, edit those blocks.
- Its branches are listed in <waiting_suggestion>. They're dropped unless you suggest them again.
- Your reason describes the whole suggestion, including what you keep.`;

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

  // Left out: the reply being written (the one this context is for), failed
  // replies (an error isn't something the AI said), and empty ones (a reply
  // stopped before its first word).
  const said = messages.filter((m) => !m.isStreaming && m.interrupted !== "failed" && m.content.trim());

  return said.map((m) => {
    const proposal = byMessage.get(m._id);
    return {
      role: m.role,
      content: m.content,
      ...(proposal && {
        proposal: {
          reason: proposal.reason,
          state: proposalState(proposal, node),
          ...keptOf(proposal),
        },
      }),
    };
  });
}

/** Accepted in part: how many of its edits and branches were kept. */
function keptOf(proposal: Doc<"proposals">): Pick<NonNullable<ChatTurn["proposal"]>, "kept"> {
  const of = proposal.edits.length + (proposal.branches?.length ?? 0);
  const left = (proposal.skipped?.length ?? 0) + (proposal.skippedBranches?.length ?? 0);
  return left > 0 ? { kept: { count: of - left, of } } : {};
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

  const node = toNodeContext(current);
  const children = await ctx.db
    .query("nodes")
    .withIndex("by_parentId", (q) => q.eq("parentId", current._id))
    .take(100);
  return {
    ancestors: chain.slice(0, -1).map(toNodeContext),
    current: node,
    children: children.map((child) => child.title),
    contentVersion: contentVersion(current),
    messages: await getChatTurns(ctx, current),
    ...(await waitingDraft(ctx, current, node.markdown)),
  };
}

/** The suggestion waiting for an answer, as a draft: its edits applied, its branches. */
async function waitingDraft(
  ctx: QueryCtx,
  node: Doc<"nodes">,
  markdown: string,
): Promise<Pick<PromptContext, "draft">> {
  const waiting = await ctx.db
    .query("proposals")
    .withIndex("by_nodeId_and_status", (q) => q.eq("nodeId", node._id).eq("status", "pending"))
    .order("desc")
    .first();
  // Out of date: its edits were made on an older document.
  if (!waiting || proposalState(waiting, node) !== "pending") return {};
  try {
    const draft = waiting.edits.length > 0 ? applyEdits(markdown, waiting.edits) : markdown;
    return { draft: { markdown: draft, reason: waiting.reason, branches: waiting.branches ?? [] } };
  } catch {
    // Its edits no longer fit: show the document as it is.
    return {};
  }
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

  // With an edit waiting, the model sees (and edits) the draft.
  const shown = context.draft?.markdown ?? context.current.markdown;
  sections.push(nodeTag("current_node", context.current, {}, numberBlocks(shown)));
  if (context.children.length > 0) {
    const titles = context.children.map((title) => `<child title="${escapeAttribute(title)}" />`);
    sections.push(`<children>\n${titles.join("\n")}\n</children>`);
  }
  if (context.draft) {
    const branches = context.draft.branches.map(
      (branch) => `<branch title="${escapeAttribute(branch.title)}">\n${branch.content}\n</branch>`,
    );
    const reason = escapeAttribute(context.draft.reason);
    sections.push(`<waiting_suggestion reason="${reason}">\n${branches.join("\n")}\n</waiting_suggestion>\n${WAITING}`);
  }
  // Only for an empty document: there the usual restraint ("most replies
  // need no edit") would leave a new node blank.
  if (!shown) sections.push(EMPTY_DOCUMENT);

  return {
    system: sections.join("\n\n"),
    messages: mergeTurns(
      context.messages.map((turn) => ({
        role: turn.role,
        content: turn.proposal ? `${turn.content}\n\n${suggestionNote(turn.proposal)}` : turn.content,
      })),
    ),
  };
}

/**
 * Joins back-to-back turns from the same side into one, so turns alternate.
 * That happens when a reply is left out: the user's message before a failed
 * reply and the one they sent after it.
 */
function mergeTurns(turns: ModelInput["messages"]): ModelInput["messages"] {
  const merged: ModelInput["messages"] = [];
  for (const turn of turns) {
    const prev = merged.at(-1);
    if (prev?.role === turn.role) prev.content = `${prev.content}\n\n${turn.content}`;
    else merged.push({ ...turn });
  }
  return merged;
}

const OUTCOMES: Record<ProposalState, string> = {
  pending: "not answered yet",
  out_of_date: "out of date: the document changed before the user answered",
  accepted: "accepted",
  rejected: "rejected",
  superseded: "replaced by a later suggestion",
};

function suggestionNote(proposal: NonNullable<ChatTurn["proposal"]>): string {
  const outcome = proposal.kept
    ? `accepted in part: ${proposal.kept.count} of its ${proposal.kept.of} changes, the user left out the rest`
    : OUTCOMES[proposal.state];
  return `<suggestion outcome="${outcome}">${proposal.reason}</suggestion>`;
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
