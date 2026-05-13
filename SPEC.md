# Mindmap — Design Spec

A spatial research tool where you think through problems with AI, and the output is a living graph of structured knowledge. Each node is a unit of research. Nodes form a tree. Children inherit parent context through distilled content, not raw chat transcripts.

This document captures the data model and the decisions behind it. Read it before changing the schema.

## The core idea

Research is nonlinear. You split into subtopics, explore tangents, compare findings, and synthesize results. Traditional tools force this into flat documents, chat timelines, or isolated conversations. Mindmap treats research as a living graph of connected investigations.

Every node represents a research unit with distilled content. Every branch represents a line of inquiry. The graph becomes the workspace, the memory system, and the deliverable.

The AI chat inside each node is how raw research becomes structured understanding. But the chat is a tool — the node's content is the artifact.

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
  content: v.optional(v.string()),
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

- **Node is the primary entity.** A node can exist before any conversation happens (e.g. from a document upload or manual creation). The chat is optional — created on demand when someone starts a conversation in that node. Zero or one chat per node.
- **Content is the context currency.** Each node has an optional `content` field — distilled knowledge that children inherit. This keeps context clean and structured rather than passing raw conversation transcripts down the tree.
- **Chat is separated from node.** A chat belongs to a node and is created on demand. This decouples the research artifact (node content) from the exploration process (chat messages). The chat is how you produce content; the content is what persists.
- **Adjacency list**, not nested documents. Adding a branch is one insert. The tree emerges from `parentId`.
- **`userId` is denormalized onto nodes** for cheap auth checks. Convex has no row-level security — every query that touches a node must verify ownership manually.

## Node content

A node's `content` field is the distilled knowledge that children see as inherited context. Content can come from three sources:

1. **Manual** — user writes or edits it directly on the node.
2. **From a document** — system extracts content from an uploaded file.
3. **From a chat** — AI distills the conversation into node content.

Content is a plain string (markdown). Children inherit content from all ancestors, not chat messages.

## Branching semantics

Branching happens at the **node level**, not the message level. You create a child node from a parent node. The child inherits the parent's content as context, regardless of what conversations happened inside either node.

This is simpler and more powerful than the previous message-level branching:

- Nodes can exist without any chat, so branches can be created before any conversation.
- Context inheritance is clean — distilled content rather than truncated transcripts.
- No need for `branchedAt` indices or message slicing logic.

### Context assembly

When the AI responds in a node:

1. Walk the ancestor chain from root to the current node.
2. Collect `content` from each ancestor node (skipping nodes with no content).
3. Include as system context in the prompt.
4. Append the current node's chat messages as the active conversation.

Siblings never share context. Each branch is isolated.

## Streaming

`isStreaming` lives on the **chat**, not the node. When an assistant response is being generated:

1. An empty message is created with `isStreaming: true`.
2. The chat is marked `isStreaming: true`.
3. Message content is patched progressively as tokens arrive.
4. When complete, both the message and chat are set to `isStreaming: false`.

Messages are append-only once finalized (once `isStreaming` is `false` or absent).

## Multi-user

The app is multi-user. Nothing in Convex enforces row-level security — every query and mutation must check ownership manually via helpers in `convex/lib/auth.ts`.

Errors use structured `ConvexError` codes (`UNAUTHORIZED`, `NOT_FOUND`) so the client can branch on intent — see `src/lib/auth-errors.ts`.

## Layout (React Flow)

The mindmap is rendered with React Flow (`@xyflow/react`). `nodes.position` is **optional** — nodes without a stored position are placed by auto-layout; dragged nodes keep their override.

- **On branch creation:** don't set `position`. Auto-layout places it.
- **On drag end:** a mutation writes `position` for that node.
- **On load:** merge computed layout with stored positions.

Layout runs client-side only. Mutations stay layout-agnostic.

## Convex architecture

- **Queries** — reactive reads. Context assembly is a query.
- **Mutations** — transactional writes. Creating a thread + root node is one mutation. Appending a message finds or creates the chat atomically.
- **Actions** — non-reactive, can call external APIs. LLM calls live here.

Sequencing for a user sending a message:

1. **Mutation** — append user message to the node's chat (creating the chat if it doesn't exist).
2. **Action** — read context for the node (ancestor content + chat messages), call the LLM, stream the response.
3. **Mutation** (from inside the action) — append assistant message progressively.

## File layout

```
convex/
├── schema.ts              # Database schema — 4 tables.
├── threads.ts             # api.threads.*   — thread CRUD.
├── nodes.ts               # api.nodes.*     — node CRUD and branching.
├── messages.ts            # api.messages.*  — message reads/appends, chat creation.
├── chat.ts                # api.chat.*      — actions that orchestrate LLM calls.
├── lib/
│   ├── auth.ts            # Ownership checks.
│   ├── context.ts         # Ancestor walk + prompt assembly.
│   ├── llm.ts             # LLM streaming and title generation.
│   ├── functions.ts       # Custom query/mutation/action wrappers with auth + rate limiting.
│   └── validation.ts      # Input normalization.
└── _generated/            # Auto-managed by Convex. Never edit.
```

## Indexes

| Index | Purpose |
|---|---|
| `threads.by_userId` | List this user's threads. |
| `nodes.by_threadId` | Load every node in a thread (tree rendering). |
| `nodes.by_parentId` | Get children of a node. |
| `chats.by_nodeId` | Find the chat for a node. |
| `messages.by_chatId_and_index` | Load messages for a chat, ordered by index. |

## Client responsibilities

### Disable send while a message is in flight

Two parallel `sendMessage` invocations against the same node are not serialized. The UI must disable the send button while a previous send is pending or while any message has `isStreaming: true`.

### Reject empty user messages before sending

The backend doesn't filter empty content. The frontend must validate `content.trim().length > 0` before calling `chat.sendMessage`.
