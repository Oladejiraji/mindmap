# Mindmap — Product Spec

A spatial thinking tool where you build structured knowledge through AI-assisted exploration. Each node is a research unit with rich, editable content. Nodes form a tree on an infinite canvas — children inherit parent context through block content, not chat transcripts.

The closest mental model: a company brain you build deliberately through active thinking, not one that passively vacuums up documents.

This document is the single source of truth for product direction. Read it before changing the schema or UX.

---

## Positioning

Most "company brain" tools are passive ingestors — they hoover up Slack, docs, meetings, and make it searchable. Mindmap is different: it's for **active thinking**. You explore a problem with AI, distill your findings into structured content, and build a living graph of knowledge.

The output isn't a chat transcript. It's a curated, editable document — the thing you'd actually share, reference, or build on.

**For v1:** individual users. No multiplayer, no team features. One person thinking through problems with AI and building a personal knowledge graph.

---

## Core concepts

### Nodes

The primary entity. A node is a unit of structured knowledge — a block document that lives on a spatial canvas. Nodes form a tree via parent-child relationships.

A node can exist without any chat. Content can be typed directly, pasted, inserted from AI, or imported from a document.

### Blocks

Node content is a **BlockNote document** — Notion-like rich blocks (headings, paragraphs, lists, tables, callouts, code, etc.). Content is stored as BlockNote JSON, not a plain markdown string.

Blocks are the artifact. Everything else (chat, AI, branching) exists to help build and refine blocks.

### Chat

An optional side panel attached to each node. Chat is the exploration tool — you ask the AI questions, it responds with full context (ancestor blocks + this node's blocks + chat history). Key parts of AI responses can be **inserted into the block content**.

Messages are append-only (no edits or deletes on individual messages). The chat persists as a record of how the node's content was built. The user can **clear an entire chat** to reset the conversation while keeping the node's block content intact.

### Canvas

The spatial view of all nodes in a thread. Rendered with React Flow. Nodes show a title and preview of their block content. You branch, rearrange, and navigate from here.

### Context inheritance

When AI responds in a node, it walks the ancestor chain from root to the current node and collects serialized block content from each ancestor. This is the research lineage — a child node knows everything its ancestors know.

Siblings never share context. Each branch is isolated.

---

## The Node Experience

### Blocks-primary, chat as tool

A node has two modes — **compact** (on the canvas) and **expanded** (the editor). Same node, same content, different renderers.

**Compact mode** — what you see on the canvas. Read-only card showing title + truncated preview of block content. Small, scannable.

**Expanded mode** — the full BlockNote editor. Editable blocks, chat panel available. The canvas is still behind it, zoomed in and dimmed.

The transition between the two should feel like **zooming into the node**, not navigating to a different page. Click a node → it smoothly expands to fill the view and becomes editable. Go back → it shrinks into its place on the canvas. No hard page cuts. Position is preserved.

The chat panel slides in from the side when toggled. It doesn't split the view 50/50 — it overlays or compresses the editor. Blocks are the star; chat is the tool you pull out when you need it.

### Empty node

When a new node is opened:
- Block editor shows a placeholder title and hint: "Start typing, or open the chat to explore"
- Chat panel **starts open** — nudges toward exploration since there's nothing to edit yet
- As soon as the user types in either place, the node is alive

When a node already has content: chat panel **starts closed** — focus on the artifact.

### Chat panel

- **Per-node.** Each node has its own conversation. When you switch nodes, the panel stays open but shows that node's chat history. This preserves provenance — which exploration produced which content.
- **Full context.** The AI sees ancestor block content, this node's blocks, and the chat history.
- **Insert to blocks.** AI responses have an "Insert" action that converts the response (or a selected portion) to blocks and appends them to the editor. No big-bang distill step — content builds up as you explore.
- **Tools.** The chat panel can modify the node's blocks — insert, replace, restructure. It's an active collaborator, not just a Q&A interface.

### Inline AI (follow-up to chat panel)

Highlight text in the block editor, get a contextual toolbar:
- **Expand** — AI elaborates, inserts below
- **Simplify** — AI rewrites, replaces in place
- **Research** — opens chat panel with the selection as a prompt
- **Branch** — creates a child node seeded with this text

Start with the chat panel. Add inline AI as a follow-up.

### Slash commands

Standard BlockNote slash commands for block types, plus:
- `/ai [prompt]` — AI generates blocks at cursor position
- `/summarize` — AI reads chat history and proposes a summary block

---

## Canvas

### Node appearance

Each node on the canvas shows:
- Title
- Preview of first few blocks (truncated)
- Branch handle for creating children

### Interactions

- **Double-click** to open a node (block editor view)
- **Drag from handle** into empty space to create a child node
- **Selection** highlights the ancestor path to root
- **Drag** to reposition (position is persisted)

### Layout

Dagre auto-layout in top-down mode. Stored positions override computed positions — dragged nodes stay where you put them.

---

## Data model

Four tables:

```ts
threads: defineTable({
  userId: v.string(),
  name: v.string(),
}).index("by_userId", ["userId"]),

nodes: defineTable({
  userId: v.string(),
  threadId: v.id("threads"),
  parentId: v.union(v.id("nodes"), v.null()),
  title: v.string(),
  content: v.optional(v.any()),    // BlockNote JSON document
  summary: v.optional(v.string()), // auto-generated summary for ancestor context
  position: v.optional(v.object({ x: v.number(), y: v.number() })),
})
  .index("by_threadId", ["threadId"])
  .index("by_parentId", ["parentId"])
  .index("by_userId_and_threadId", ["userId", "threadId"]),

chats: defineTable({
  nodeId: v.id("nodes"),
  isStreaming: v.optional(v.boolean()),
}).index("by_nodeId", ["nodeId"]),

messages: defineTable({
  chatId: v.id("chats"),
  role: v.union(v.literal("user"), v.literal("assistant")),
  content: v.string(),
  index: v.number(),
  isStreaming: v.optional(v.boolean()),
}).index("by_chatId_and_index", ["chatId", "index"]),
```

### Why this shape

- **Node is the primary entity.** A node can exist before any conversation happens. Chat is optional — created on demand. Zero or one chat per node.
- **Content is BlockNote JSON.** Stored as `v.any()` to accommodate BlockNote's block structure. Serialized to markdown for context inheritance. A companion `summary` field stores a compressed version for ancestor context (auto-generated when blocks change).
- **Chat is separated from node.** Decouples the artifact (block content) from the exploration process (chat). The chat is how you produce content; the blocks are what persists.
- **Adjacency list.** Adding a branch is one insert. The tree emerges from `parentId`.
- **`userId` is denormalized onto nodes** for cheap auth checks. Convex has no row-level security.

### Context assembly

When AI responds in a node, three sources are combined into the prompt:

1. **Ancestor context** (system prompt prefix) — walk the ancestor chain from root to current node. Immediate parent: full blocks serialized to markdown. Grandparent and above: use the `summary` field. See "Context management" below.
2. **Current node's blocks** (system prompt) — the full BlockNote content serialized to markdown. This is what the AI is helping you build.
3. **Chat history** (conversation) — the messages in this node's chat.

### Context management

Context has three sources with different characteristics:

| Source | Growth | Management |
|---|---|---|
| **Chat history** | Per conversation, fast | User can clear. Sliding window + summarization of older messages. |
| **Current blocks** | Per node, moderate | Generally small. Treated as a system prompt. Not compressed. |
| **Ancestor blocks** | Per tree depth, unbounded | The hard problem. See below. |

**Chat history** is the easiest to manage. The user can clear a chat at any time, resetting the conversation while keeping the node's block content intact. For long conversations, older messages are summarized into a "conversation so far" preamble and only the last N messages are sent in full.

**Ancestor blocks** are the hard problem. They must be present in every request (that's the point of inheritance) and grow with tree depth. Two mechanisms keep this bounded:

1. **Summary field.** Each node stores an auto-generated `summary` alongside its full blocks. When blocks change, a background job regenerates the summary. Context assembly uses summaries for all ancestors except the immediate parent (which gets full blocks). This caps ancestor context regardless of tree depth.

2. **Prompt caching.** Ancestor context is stable between messages in the same chat. Use Claude's `cache_control: "ephemeral"` on the ancestor prefix — input tokens are charged once per hour, not per message. This doesn't reduce context size but dramatically reduces cost at deep branches.

**Token budget.** A total context budget (configurable, default ~80k tokens) is enforced. If the assembled context exceeds it, chat history is compressed first (sliding window), then ancestor summaries are truncated from the root inward (deepest ancestors are least relevant).

### Document ingestion (v1)

Simple: paste or upload a document into a node. Content is extracted and converted to blocks. No auto-chunking into child nodes — that's a future feature.

---

## Architecture

### Convex patterns

- **Queries** — reactive reads. Context assembly is a query.
- **Mutations** — transactional writes. Creating a thread + root node is one mutation.
- **Actions** — non-reactive, external APIs. LLM calls live here.

### Sequencing for a user message

1. **Mutation** — append user message to the node's chat (creating the chat if needed).
2. **Action** — read context (ancestor blocks + chat messages), call the LLM, stream the response.
3. **Mutation** (from inside the action) — append assistant message progressively.

### Streaming

`isStreaming` lives on the chat, not the node. When an assistant response is being generated:
1. Empty message created with `isStreaming: true`.
2. Chat marked `isStreaming: true`.
3. Message content patched progressively.
4. On completion, both set to `isStreaming: false`.

Messages are append-only once finalized.

### Auth

Email/password via `@convex-dev/better-auth`. `userId` required on threads and nodes. Every query/mutation verifies ownership. Errors use structured `ConvexError` codes.

---

## v1 scope

### In

- Block editor (BlockNote) for node content
- Chat side panel with insert-to-blocks
- Canvas with React Flow
- Context inheritance through serialized blocks
- Simple document import (paste/upload)
- Individual user auth
- Auto-layout with position persistence

### Out (future)

- Multiplayer / real-time collaboration
- Team workspaces and permissions
- Inline AI (highlight → contextual actions)
- Synthesis nodes
- Agent tool use (web search, code execution)
- Per-node model/temperature selection
- Cross-node search

---

## File layout

```
convex/
├── schema.ts              # Database schema
├── threads.ts             # Thread CRUD
├── nodes.ts               # Node CRUD and branching
├── messages.ts            # Message reads/appends, chat creation
├── chat.ts                # Actions that orchestrate LLM calls
├── lib/
│   ├── auth.ts            # Ownership checks
│   ├── context.ts         # Ancestor walk + prompt assembly
│   ├── llm.ts             # LLM streaming and title generation
│   ├── functions.ts       # Custom wrappers with auth + rate limiting
│   └── validation.ts      # Input normalization
└── _generated/            # Auto-managed by Convex

src/
├── app/                   # Next.js routes (App Router)
├── components/
│   ├── canvas/            # React Flow canvas and node renderers
│   ├── chat/              # Chat panel components
│   └── ui/                # shadcn/base-ui primitives
├── lib/                   # Utilities (layout, tree, auth errors)
└── services/              # Convex query/mutation hooks
```

---

## Indexes

| Index | Purpose |
|---|---|
| `threads.by_userId` | List this user's threads |
| `nodes.by_threadId` | Load every node in a thread (tree rendering) |
| `nodes.by_parentId` | Get children of a node |
| `nodes.by_userId_and_threadId` | Scoped node listing |
| `chats.by_nodeId` | Find the chat for a node |
| `messages.by_chatId_and_index` | Load messages ordered by index |
