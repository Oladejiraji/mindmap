# Mindmap — Design Spec

A chat app where conversations branch like a mindmap. Each node is a full chat. Children inherit parent context up to a branch point. Siblings are isolated from each other.

This document captures the data model and the decisions behind it. Read it before changing the schema — several choices have non-obvious consequences.

## The core idea

A linear chat forces you to choose between "go deeper on this tangent" and "keep the main thread clean." A tree of chats removes that choice: branch off when you want to go deep, and the child gets a clean space with the parent's context already loaded.

Concretely: you're learning about DI containers. You ask about service lifetimes, the LLM explains singleton/scoped/transient, you don't fully get "scoped." Instead of continuing in the same thread (and polluting it with deep-scoped details), you branch. The child inherits the conversation up to that point. You explore scoped there. The parent stays about DI at the top level.

## Data model

Three tables:

```ts
threads: defineTable({
  userId: v.id("users"),
  name: v.string(),
}).index("by_user", ["userId"]),

nodes: defineTable({
  threadId: v.id("threads"),
  userId: v.id("users"),                        // denormalized for cheap auth checks
  parentId: v.union(v.id("nodes"), v.null()),   // null = root of the thread
  branchedAt: v.optional(v.number()),           // # of parent messages inherited
  title: v.string(),
})
  .index("by_thread", ["threadId"])
  .index("by_parent", ["parentId"]),

messages: defineTable({
  nodeId: v.id("nodes"),
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  index: v.number(),
}).index("by_node", ["nodeId", "index"]),
```

### Why this shape

- **Adjacency list**, not nested documents. Adding a branch is one insert. Moving a subtree is one update. The tree emerges from `parentId`.
- **A thread is a wrapper with metadata** (name, ownership). Every thread has exactly one root node (the node with `parentId = null`). When you create a thread, the mutation creates both atomically.
- **`userId` is denormalized onto nodes** for cheap auth checks. Convex has no row-level security — every query that touches a node must verify ownership manually, and one field avoids an extra lookup per check. Ownership never transfers, so sync is trivial.
- **Messages have an explicit `index`**, not just `_creationTime`, because `branchedAt` points into this ordering and needs to be stable.

## Branching semantics

### Frozen prefix at the branch point

When you branch off a parent, the child inherits **only the parent's messages up to the moment of branching**. New messages added to the parent *after* the branch are invisible to the child, forever.

`branchedAt` on the child is the number of parent messages inherited. Context assembly slices `parent.messages[0 .. branchedAt]`. Because messages are append-only, this prefix is naturally stable — no snapshotting, no copying.

**Why not "live whole parent"?** If the child saw all of the parent's current messages (including future ones), every branch would slowly re-pollute itself with whatever direction the parent went after forking. That defeats the feature. The whole point of branching is to isolate.

**Consequence:** you can branch at *any* point in a parent, not just the end. "Scroll up, click message 3, branch here" → child inherits `P[0..3]` while `P` might already be at `P[20]`. Retroactive branching for free.

### The trigger message lives in the new child

When a branch is created (manually or by the LLM), the message that triggered it **moves to the new child, not the parent**. Both flows collapse to the same rule:

- **Manual:** user clicks "branch" while composing. Their message routes to a new child node with `branchedAt = P.messages.length`.
- **LLM-initiated:** LLM receives the user's message, decides it's a tangent, calls a `create_branch` tool *instead of* answering. The app creates the child, puts the user's message in it, then runs the LLM again against the child's context to generate the actual answer.

Either way, the parent never sees the tangent. Parent stays clean.

### Context assembly

When the user sends a message in node N:

1. Walk `N → parent → ... → root`, collecting ancestors in order.
2. For each ancestor, slice its messages by `branchedAt` (the child's `branchedAt` tells you how many of *its own parent's* messages it inherits).
3. Concatenate: `[root[0..N1.branchedAt], ..., parent[0..N.branchedAt], N.messages, newUserMessage]`.
4. Send to LLM.

Siblings are never on each other's ancestor chain, so they're automatically invisible to each other. Free property of the tree.

**Live, not snapshot.** Because messages are append-only and `branchedAt` is a stable prefix, walking the ancestor chain at LLM-call time always gives the correct context. No copying at branch time. Convex queries are reactive, so any UI view of a node's context updates automatically when an ancestor prefix grows — which it can't, because append-only.

## Immutability: messages are append-only

Messages are **never edited and never deleted**. This is a hard invariant.

### Why

`branchedAt` is a positional pointer. Editing an ancestor message would silently change the context every descendant sees, invalidating assistant replies that were generated against the old content. Deleting an ancestor message would shift indices and break every `branchedAt` that pointed past the deletion.

Making messages immutable makes `branchedAt: number` trivially correct. No reconciliation logic, no versioning, no tombstones.

### "But I want to fix typos"

The v2 plan: **editing a message creates a new branch at that point.** The original stays, a sibling branch sprouts with the edited version as its first message. The mindmap *is* the edit history — alternative phrasings become first-class exploration paths, which is genuinely useful for a learning tool.

This reuses the branching primitive. No new schema. No new data concept. The UI word shouldn't be "edit" (that implies in-place mutation) — "rephrase" or "try again" is more honest.

### Assistant messages aren't editable either

Regenerating an assistant reply is just "branch off the user message just before it." The existing primitive handles it.

### What about deleting a whole node or thread?

**Not supported in v1.** Soft delete was considered and rejected — it adds `isDeleted` filter discipline to every query, cascade logic, and GDPR implications, in exchange for a feature (cleanup) that's marginal for a learning tool where the mindmap is the point.

When it starts to bother users, the right answer is probably **archive** (hide from sidebar, keep data intact) rather than delete. That's a one-field addition when the time comes.

## Multi-user

The app is multi-user. Nothing in Convex enforces row-level security — every query and mutation must check ownership manually.

A small helper used everywhere:

```ts
async function assertNodeOwner(ctx, nodeId) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  const node = await ctx.db.get(nodeId);
  if (!node || node.userId !== identity.subject) throw new Error("Not authorized");
  return node;
}
```

Ancestor walks should also assert ownership defensively on every hop — a bug that lets user A branch off user B's node would silently leak B's context into A's LLM calls.

## Convex architecture

- **Queries** — reactive reads. Context assembly (ancestor walk + slicing) is a query, so views re-run automatically when relevant data changes.
- **Mutations** — transactional writes. Creating a thread + root node is one mutation. Appending a user message is one mutation. Creating a branch (new node + first message) is one mutation.
- **Actions** — non-reactive, can call external APIs. LLM calls live here. An action reads context via `ctx.runQuery(getContext)`, calls the model, then writes the assistant response via `ctx.runMutation(appendMessage)`.

Sequencing for a user sending a message:

1. **Mutation** — append user message to node N.
2. **Action** — read context for N (now including the new user message), call the LLM, receive response.
3. **Mutation** (from inside the action) — append assistant message to N.

For LLM-initiated branching, the action gets a tool-call response instead of a completion:

1. Mutation — append user message to N.
2. Action — call LLM with N's context. LLM returns a `create_branch` tool call.
3. Mutation — create child node C (`parentId = N`, `branchedAt = N.messages.length - 1`), move the user message from N to C.
4. Action — call LLM again with C's context. Receive completion.
5. Mutation — append assistant message to C.

The action must `await` the mutation before the follow-up LLM call so the context read is consistent.

## Indexes

Every index exists to serve a specific access pattern:

| Index | Purpose |
|---|---|
| `threads.by_user` | Sidebar: list this user's threads. |
| `nodes.by_thread` | Load every node in a thread (tree rendering). |
| `nodes.by_parent` | Get children of a node (subtree rendering). |
| `messages.by_node` | Load messages for a node, ordered by `index`. |

Add more only when a new access pattern shows up. Convex requires every `withIndex` lookup to match a declared index.

## Deferred decisions

Things we haven't committed to because they don't shape the data model:

- **Streaming LLM responses.** Start with wait-for-full-response. Streaming is extra wiring (each chunk is a mutation) and can be added later without schema changes.
- **Title generation.** Start with "Untitled" + rename. Auto-generated titles from the first exchange come later.
- **Model choice.** One default model to start. Per-node configurability is overkill for v1.
- **LLM-initiated branching cost.** The flow costs two LLM calls per message (detect tangent → answer in branch). Fine for v1, can be optimized with smarter routing later.
- **Archive UI.** A `isArchived` boolean on threads when the sidebar starts feeling cluttered.
- **Hard delete for GDPR compliance.** When users ask.
