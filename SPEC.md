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
  userId: v.string(),                                             // Better Auth subject — opaque string, not an Id<"users">
  name: v.string(),
}).index("by_userId", ["userId"]),

nodes: defineTable({
  userId: v.string(),                                             // denormalized for cheap auth checks
  threadId: v.id("threads"),
  parentId: v.union(v.id("nodes"), v.null()),                     // null = root of the thread
  branchedAt: v.optional(v.number()),                             // # of parent messages inherited
  title: v.string(),
  position: v.optional(v.object({ x: v.number(), y: v.number() })), // manual layout override, see "Layout"
  isStreaming: v.optional(v.boolean()),                           // true while an assistant reply is in flight
})
  .index("by_threadId", ["threadId"])
  .index("by_parentId", ["parentId"])
  .index("by_userId_and_threadId", ["userId", "threadId"]),

messages: defineTable({
  nodeId: v.id("nodes"),
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  index: v.number(),
  isStreaming: v.optional(v.boolean()),                           // true while this row is being appended to
}).index("by_nodeId_and_index", ["nodeId", "index"]),
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

Messages are **never edited and never deleted** once finalized. This is a hard invariant — with one narrow, deliberate exception for streaming (see below).

### Why

`branchedAt` is a positional pointer. Editing an ancestor message would silently change the context every descendant sees, invalidating assistant replies that were generated against the old content. Deleting an ancestor message would shift indices and break every `branchedAt` that pointed past the deletion.

Making messages immutable makes `branchedAt: number` trivially correct. No reconciliation logic, no versioning, no tombstones.

### Exception: messages being streamed

Assistant messages generated by the LLM are written progressively as tokens arrive. A streaming message is created up front with empty `content` and `isStreaming: true`, then patched repeatedly as chunks come in, and finally flipped to `isStreaming: false` when generation completes.

The invariant is therefore refined:

> A message's content is mutable while `isStreaming: true`. Once `isStreaming` is `false` (or absent), the message is append-only forever.

This keeps append-only's guarantees intact for the case that actually matters — **historical messages never change**. A message that's still being generated isn't history yet; it's nascent state on its way to being frozen.

Why this doesn't break `branchedAt`:

- `branchedAt` counts messages, not bytes. A streaming message has a fixed `index` from the moment it's inserted — only its `content` grows. The count of messages in the parent is stable during streaming.
- Context assembly walks ancestors live at query time (not snapshot), so descendants that branched before or during streaming automatically see the latest content of every inherited message. When streaming finishes, children's contexts update reactively with zero extra work.
- Branching off a streaming message is allowed but awkward — the child inherits whatever partial content exists at branch time, and sees it fill in as the parent continues streaming. The UI should generally gate the branch button on `!parentMessage.isStreaming` to avoid confusion, but nothing in the data model prevents it.

Edits and deletes of finalized messages remain forbidden, full stop.

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

A small helper used everywhere ([convex/lib/auth.ts](convex/lib/auth.ts)):

```ts
async function requireNode(ctx, nodeId) {
  const userId = await requireUserId(ctx);
  const node = await ctx.db.get(nodeId);
  if (!node || node.userId !== userId) {
    throw new ConvexError({ code: "NOT_FOUND", message: "Not found" });
  }
  return node;
}
```

Errors use structured `ConvexError` codes (`UNAUTHORIZED`, `NOT_FOUND`) so the client can branch on intent without regex-matching messages — see [src/lib/auth-errors.ts](src/lib/auth-errors.ts). Ancestor walks should also assert ownership defensively on every hop — a bug that lets user A branch off user B's node would silently leak B's context into A's LLM calls.

## Layout (React Flow)

The mindmap is rendered with React Flow (`@xyflow/react`). React Flow requires every node to have an explicit `(x, y)` position — it does no layout of its own. We need those coordinates without forcing the user to arrange every branch manually, *and* we need user-dragged positions to persist.

### The hybrid model

`nodes.position` is **optional**. The field is either set (user has dragged this node, their position wins) or absent (the node has never been touched, auto-layout places it).

The rules:

- **On branch creation:** don't set `position`. Leave it undefined.
- **On drag end:** a debounced mutation writes `position` for that single node. It becomes an override.
- **On load:** the client takes every node in the thread and produces final React Flow coordinates by merging computed and stored positions (below).
- **Never auto-layout inside a mutation.** Mutations stay fast and layout-agnostic. Layout is purely a rendering concern; if the algorithm changes, existing data doesn't need to migrate.

### Sync: how computed and stored positions merge

Every time the client loads a thread, it does this:

1. **Query:** pull all `nodes` for the thread from Convex (reactive — auto-re-runs on any change).
2. **Compute:** run an auto-layout algorithm (`dagre`, `d3-hierarchy`, or similar) over the tree structure. This produces an `(x, y)` for *every* node, deterministically, based only on the parent-child topology. Output: `computed: Map<nodeId, {x, y}>`.
3. **Merge:** for each node, pick its final position as `node.position ?? computed.get(node._id)`. Nodes that have been dragged use the stored value; everyone else uses the computed one.
4. **Hand to React Flow:** emit the RF `nodes` array using merged positions, and derive the RF `edges` array from `parentId`. Pass both to `<ReactFlow />`.

Because layout runs client-side and is deterministic, two users viewing the same thread on different devices see the same arrangement for never-dragged nodes, and the same arrangement for dragged ones (since those are stored in Convex).

### What happens when the tree changes

New branches, message additions, title edits — all of these re-run the Convex query reactively, which re-runs the layout pipeline. The key property of the hybrid model:

- **Unmoved nodes shift** to accommodate new siblings or descendants, because auto-layout recomputes over the new topology.
- **Moved nodes stay exactly where they were**, because their override `position` isn't touched by the topology change.

This is usually what the user wants: "the parts I cared about enough to arrange stay arranged; everything else rebalances around them." The only failure mode is if an unmoved node ends up overlapping a moved one — the layout algorithm doesn't know about overrides when computing. If this becomes a problem, the fix is to feed overrides into the layout pass as fixed-position constraints (most layout libraries support this), not to abandon the hybrid model.

### Viewport state

Pan and zoom of the React Flow canvas itself are **client-side only** — local storage, per-user, per-thread. Not in Convex. Syncing viewport across devices is a feature users rarely want (different screen sizes, different zoom preferences) and adds write traffic on every wheel-scroll.

### Collapsing subtrees (deferred)

"Hide this branch's children" is likely client-side state too. Revisit if users want it to persist across devices; until then, a local `Set<nodeId>` of collapsed nodes is enough.

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

## File layout

The `convex/` directory is organized by **entity**, not by function type. Convex maps file paths to API paths — a mutation defined in `threads.ts` is exposed as `api.threads.<name>`, which is exactly the shape you want.

```
convex/
├── schema.ts              # Database schema — the 3 tables defined above.
├── threads.ts             # api.threads.*   — queries/mutations over threads.
├── nodes.ts               # api.nodes.*     — queries/mutations over nodes.
├── messages.ts            # api.messages.*  — queries/mutations over messages.
├── chat.ts                # api.chat.*      — actions that orchestrate LLM calls.
├── lib/
│   ├── auth.ts            # requireUserId, requireThread, requireNode — ownership checks.
│   └── context.ts         # walkAncestors, buildPromptContext — ancestor walk + prompt assembly.
└── _generated/            # Auto-managed by Convex. Never edit.
```

### Why this shape

1. **One file per table.** `threads.ts`, `nodes.ts`, `messages.ts` each own their entity. When you need to modify how threads are created, you know exactly where to go. The API path (`api.threads.create`) mirrors the data model.
2. **Actions are isolated in `chat.ts`.** Actions have different rules from queries and mutations (can call external APIs, not transactional, not reactive). Putting them next to pure functions blurs the mental model. A dedicated file makes "impure code lives here" visible at the directory level.
3. **Shared helpers live in `lib/`.** Non-function TypeScript modules that queries, mutations, and actions import. `lib/auth.ts` holds the ownership helpers used everywhere; `lib/context.ts` holds the ancestor walk and prompt builder — both are called from multiple entry points and don't belong inside any one entity file.
4. **No per-type folders.** Splitting `threads` across a `queries/` folder and a `mutations/` folder inflates API paths (`api.threads.queries.list`) and scatters closely-related code. A single `threads.ts` with a `query` named `list` and a `mutation` named `create` reads cleaner.

### What lives where

| File | Contains | Example exports |
|---|---|---|
| `schema.ts` | The schema, default-exported. | `defineSchema({ threads, nodes, messages })` |
| `threads.ts` | Thread CRUD. | `list`, `create` (creates thread + root node atomically), `rename`, `get` |
| `nodes.ts` | Node CRUD and branching. | `listByThread`, `createBranch`, `updatePosition`, `get` |
| `messages.ts` | Message reads and appends. | `listByNode`, `append` |
| `chat.ts` | LLM orchestration. | `sendMessage` (the action that reads context, calls the model, and writes the assistant response) |
| `lib/auth.ts` | Ownership helpers. Not Convex functions — plain TS modules. | `requireUserId(ctx)`, `requireThread(ctx, threadId)`, `requireNode(ctx, nodeId)` |
| `lib/context.ts` | Tree traversal and prompt building. Plain TS modules. | `walkAncestors(ctx, nodeId)`, `buildPromptContext(ctx, nodeId)` |

### Runtime note

Actions run in Convex's V8 isolate by default, which supports `fetch` and most modern JS. This is the preferred runtime — it's lighter and has faster cold starts. If `chat.ts` ever needs a Node-only dependency (filesystem, native addon, a library that uses Node built-ins), add `"use node";` as the first line of the file — Convex will move that module to the Node runtime. Don't add it preemptively.

## Client responsibilities

A few invariants the backend deliberately does not enforce because they're cheaper and clearer to handle in the UI. These are not nice-to-haves — the rest of the system relies on them.

### Disable send while a message is in flight

`chat.sendMessage` is an action: append user message → read context → call LLM → append assistant reply, sequentially. But **two parallel invocations of `sendMessage` against the same node are not serialized.** If a user fires two messages back-to-back, the actions race: each reads its own snapshot of the context, each LLM call can finish in either order, and the final message order in the node could end up as `[user1, user2, assistant1, assistant2]` instead of `[user1, assistant1, user2, assistant2]`.

The fix is at the UI layer: **disable the send button (and any other path that triggers `sendMessage`) for the active node while a previous send is pending.** One pending request per node at a time, at most.

"In flight" has two parts, both of which must block the send button:

1. **The action has been invoked but has not returned yet.** Track via `useAction`'s pending flag or equivalent local state.
2. **Any message in the current node has `isStreaming: true`.** The action returns as soon as it finishes orchestrating, but the streaming window can extend briefly past the return. The safe check is on the data: if there's an unfinished assistant message in the node, the node is still busy.

Gate the send button on both conditions. The same flag should also disable the branch button, since branching off a streaming message is valid but confusing.

This avoids a class of bugs that would otherwise need either per-node locking or post-hoc message reordering in the backend. Cheap on the client, zero schema impact.

### Reject empty user messages before sending

`messages.append` and `nodes.createBranch` both accept `content: v.string()`, which technically allows the empty string. The backend doesn't filter empty content — once an empty message lands, it's permanent (append-only), and an empty turn in the LLM context confuses the model.

The frontend must therefore **trim and validate `content.trim().length > 0` before calling either `chat.sendMessage` or `nodes.createBranch`.** Both code paths share the same input field; one validation gate covers both flows. Apply it as early as possible — ideally on the send button's `disabled` state, not just on submit.

## Indexes

Every index exists to serve a specific access pattern:

| Index | Purpose |
|---|---|
| `threads.by_userId` | Sidebar: list this user's threads. |
| `nodes.by_threadId` | Load every node in a thread (tree rendering). |
| `nodes.by_parentId` | Get children of a node (subtree rendering). |
| `messages.by_nodeId_and_index` | Load messages for a node, ordered by `index`. |

Add more only when a new access pattern shows up. Convex requires every `withIndex` lookup to match a declared index.

## Deferred decisions

Things we haven't committed to because they don't shape the data model:

- **Streaming LLM responses.** Start with wait-for-full-response. Streaming is extra wiring (each chunk is a mutation) and can be added later without schema changes.
- **Title generation.** Start with "Untitled" + rename. Auto-generated titles from the first exchange come later.
- **Model choice.** One default model to start. Per-node configurability is overkill for v1.
- **LLM-initiated branching cost.** The flow costs two LLM calls per message (detect tangent → answer in branch). Fine for v1, can be optimized with smarter routing later.
- **Archive UI.** A `isArchived` boolean on threads when the sidebar starts feeling cluttered.
- **Hard delete for GDPR compliance.** When users ask.
